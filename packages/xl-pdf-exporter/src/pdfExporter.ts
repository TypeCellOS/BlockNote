import {
  Block,
  BlockNoteSchema,
  BlockSchema,
  Exporter,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import {
  isPdfStandardViolation,
  type TypstDiagnostic,
} from "@blocknote/xl-typst-compiler";
import {
  TypstDocumentOptions,
  TypstExporter,
  TypstExporterOptions,
} from "@blocknote/xl-typst-exporter";
import {
  compileTypstToPdf,
  TypstCompileOptions,
} from "./pdfua/compileTypst.js";
import {
  DEFAULT_EMOJI_FONT_FAMILY,
  loadDefaultBodyFonts,
  loadDefaultEmojiFont,
} from "./pdfua/defaultFonts.js";

/** Options for {@link PDFExporter}'s export methods. */
export type PdfExportOptions = TypstCompileOptions & {
  /**
   * Try to produce a *declared* PDF/UA-1 document - the claim is made only
   * when the document earns it. Typst
   * validates conformance at compile time (document title present, first
   * heading level 1, consecutive heading levels, alt text on images and
   * equations, ...); a conforming document gets the `pdfuaid` conformance
   * claim, a nonconforming one is automatically re-exported as
   * tagged-but-unclaimed - an honest output rather than a false claim -
   * with the violations reported in the result's {@link PdfUAResult}.
   *
   * The tagged (accessible) structure tree is always emitted either way.
   * Set `false` to skip the claim and its validation entirely (e.g. for a
   * live preview, where the validation compile would be wasted work).
   *
   * Attempting the claim requires the document's language
   * (`documentOptions.lang`) - the one conformance input only the caller
   * can provide - and throws without it.
   *
   * @default true
   */
  tryDeclarePdfUA?: boolean;
};

/** One PDF/UA-1 conformance violation, safe to surface in an app's UI. */
export type PdfUAViolation = {
  /** Typst's diagnostic message, e.g. "PDF/UA-1 error: missing alt text". */
  message: string;
  /** Remediation hints accompanying the message. */
  hints: string[];
};

/** Whether (and why not) the produced PDF declares PDF/UA-1 conformance. */
export type PdfUAResult =
  | { declared: true }
  | { declared: false; reason: "tryDeclarePdfUA-disabled" }
  | {
      declared: false;
      reason: "nonconforming";
      violations: PdfUAViolation[];
    };

/**
 * The outcome of {@link PDFExporter.toBytes}. A document that fails to
 * compile is an expected outcome (the source is generated from user
 * content: text no supplied font covers, broken caller-supplied
 * header/footer markup, ...), so it's a value carrying the compiler's
 * diagnostics - not an exception.
 */
export type PdfExportResult =
  | {
      error?: undefined;
      bytes: Uint8Array;
      pdfUA: PdfUAResult;
      compileWarnings: TypstDiagnostic[];
    }
  | {
      error: "compile-failed";
      compileErrors: TypstDiagnostic[];
      compileWarnings: TypstDiagnostic[];
    };

/** The outcome of {@link PDFExporter.toBlob}. See {@link PdfExportResult}. */
export type PdfBlobExportResult =
  | {
      error?: undefined;
      blob: Blob;
      pdfUA: PdfUAResult;
      compileWarnings: TypstDiagnostic[];
    }
  | {
      error: "compile-failed";
      compileErrors: TypstDiagnostic[];
      compileWarnings: TypstDiagnostic[];
    };

/**
 * Exports BlockNote documents to accessible, tagged PDF files - PDF/UA-1
 * when the document conforms (see {@link PdfExportOptions.tryDeclarePdfUA}) -
 * powered by Typst compiled to WebAssembly
 * (`@blocknote/xl-typst-compiler`): the whole pipeline runs client-side,
 * with no network access.
 *
 * The mappings are *Typst* mappings ({@link typstDefaultSchemaMappings});
 * this class is a {@link TypstExporter} plus the PDF compile step, so
 * everything documented there applies - including that an exporter instance
 * accumulates assets for its lifetime: create a fresh exporter per export
 * when repeatedly exporting changing content (construction is cheap).
 *
 * Zero-config exports match the editor: the compile options' `fonts` and
 * `emojiFont` each default (independently) to the bundled set - Inter,
 * Geist Mono, New Computer Modern Math resp. Noto Color Emoji - loaded
 * lazily from the package, and the compiler wasm loads from its own
 * package's files. Pass a value (or an explicit `[]` for no fonts) to take
 * over either.
 *
 * (The previous react-pdf based exporter is still available from
 * `@blocknote/xl-pdf-exporter/react-pdf` during its deprecation window.)
 */
export class PDFExporter<
  B extends BlockSchema,
  S extends StyleSchema,
  I extends InlineContentSchema,
> extends TypstExporter<B, S, I> {
  public constructor(
    schema: BlockNoteSchema<B, I, S>,
    mappings: Exporter<
      NoInfer<B>,
      NoInfer<I>,
      NoInfer<S>,
      string,
      string,
      (inner: string) => string,
      string
    >["mappings"],
    options?: Partial<TypstExporterOptions>,
  ) {
    super(schema, mappings, {
      // The bundled default fonts (see `defaultFonts.ts`) include Noto
      // Color Emoji; declaring the family by default lets multi-codepoint
      // emoji shape correctly with zero config. Callers supplying their own
      // fonts can override (or unset) it.
      emojiFontFamily: DEFAULT_EMOJI_FONT_FAMILY,
      ...options,
    });
  }

  /**
   * Export a document to PDF bytes: BlockNote document -> Typst -> tagged
   * PDF (wasm), declared PDF/UA-1 when the document conforms (see
   * {@link PdfExportOptions.tryDeclarePdfUA}). The result reports whether the
   * claim was made and the conformance violations when it wasn't - or, for
   * a document that fails to compile at all, the compiler's diagnostics
   * (see {@link PdfExportResult}).
   */
  public async toBytes(
    blocks: Block<B, I, S>[],
    options: PdfExportOptions = {},
    documentOptions?: TypstDocumentOptions,
  ): Promise<PdfExportResult> {
    const { tryDeclarePdfUA = true, ...compileOptions } = options;
    const typst = await this.toTypst(blocks, documentOptions);
    // The images collected during the export are mapped into the compiler
    // alongside (not instead of) any assets the caller supplied - e.g. an
    // image referenced from the header/footer markup. A caller asset under
    // the exporter's own key space would be silently shadowed by the merge,
    // so that's rejected loudly instead (a programmer error, not an
    // expected outcome - hence a throw, unlike compile failures).
    for (const key of compileOptions.assets?.keys() ?? []) {
      if (this.assetFiles.has(key)) {
        throw new Error(
          `PDFExporter: the caller-supplied asset "${key}" collides with an ` +
            `asset registered by the exporter - use a path outside /assets/`,
        );
      }
    }
    // Zero-config fonts: each option defaults independently to the bundled
    // set matching the editor - `undefined` means "use the default", a
    // supplied value (including an explicit `[]` for none) takes over. The
    // independence keeps the bytes consistent with the constructor's
    // independent `emojiFontFamily` default: custom body fonts don't
    // silently drop emoji support, and vice versa.
    const [fonts, emojiFont] = await Promise.all([
      compileOptions.fonts === undefined
        ? loadDefaultBodyFonts()
        : compileOptions.fonts,
      compileOptions.emojiFont === undefined
        ? loadDefaultEmojiFont()
        : compileOptions.emojiFont,
    ]);
    const resolved: TypstCompileOptions = {
      ...compileOptions,
      fonts,
      emojiFont,
      assets: new Map([...(compileOptions.assets ?? []), ...this.assetFiles]),
    };

    if (!tryDeclarePdfUA) {
      return withPdfUA(await compileTypstToPdf(typst, resolved), {
        declared: false,
        reason: "tryDeclarePdfUA-disabled",
      });
    }

    // Attempting the claim without a document language is a caller-args
    // error (like the asset collision above), not a document
    // nonconformity: the PDF would otherwise carry Typst's silently
    // defaulted language (English), and a wrong `/Lang` (e.g. "en" on a
    // German document) is an accessibility defect no validator can catch.
    // Unlike heading structure or alt text - content the end user can fix -
    // the language is an integration-time decision only the caller can
    // make, so it fails loudly at development time instead of quietly
    // producing forever-unclaimed exports.
    if (!documentOptions?.lang) {
      throw new Error(
        "PDFExporter: declaring PDF/UA-1 (tryDeclarePdfUA, the default) " +
          "requires the document's language - pass its BCP-47 tag in the " +
          'document options (e.g. { lang: "en" }), or opt out of the ' +
          "claim with tryDeclarePdfUA: false.",
      );
    }

    const declared = await compileTypstToPdf(typst, {
      ...resolved,
      pdfStandard: "ua-1",
    });
    if (!declared.error) {
      return {
        bytes: declared.pdf,
        pdfUA: { declared: true },
        compileWarnings: declared.compileWarnings,
      };
    }
    // Only conformance violations fall back to an unclaimed export; any
    // other failure (broken markup, missing font) would fail the fallback
    // compile too, so it surfaces as the compile failure it is. (Violations
    // are always *errors* - Typst emits every validator finding as an
    // error, never a warning - so classifying compileErrors alone is
    // complete. The declared attempt's compileWarnings are dropped here,
    // but nothing is lost: the fallback compiles the same document with
    // the same fonts, so the result below carries the identical warnings.)
    if (!declared.compileErrors.every(isPdfStandardViolation)) {
      return declared;
    }
    return withPdfUA(await compileTypstToPdf(typst, resolved), {
      declared: false,
      reason: "nonconforming",
      violations: declared.compileErrors.map(({ message, hints }) => ({
        message,
        hints,
      })),
    });
  }

  /**
   * Export a document to a PDF Blob (e.g. for downloads / object URLs),
   * with the same result reporting as {@link toBytes}.
   */
  public async toBlob(
    blocks: Block<B, I, S>[],
    options: PdfExportOptions = {},
    documentOptions?: TypstDocumentOptions,
  ): Promise<PdfBlobExportResult> {
    const result = await this.toBytes(blocks, options, documentOptions);
    if (result.error) {
      return result;
    }
    // The pipeline always returns a view over a plain (non-shared) buffer;
    // the cast narrows `ArrayBufferLike` for `BlobPart`.
    return {
      blob: new Blob([result.bytes as Uint8Array<ArrayBuffer>], {
        type: "application/pdf",
      }),
      pdfUA: result.pdfUA,
      compileWarnings: result.compileWarnings,
    };
  }
}

function withPdfUA(
  compiled: Awaited<ReturnType<typeof compileTypstToPdf>>,
  pdfUA: PdfUAResult,
): PdfExportResult {
  if (compiled.error) {
    return compiled;
  }
  return {
    bytes: compiled.pdf,
    pdfUA,
    compileWarnings: compiled.compileWarnings,
  };
}
