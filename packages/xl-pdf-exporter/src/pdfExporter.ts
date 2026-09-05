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

/**
 * {@link PDFExporter}'s options: everything the *exporter* is (like the
 * other exporters' option types) - the Typst styling options including the
 * font *family names*, plus the engine inputs those names resolve against:
 * the font *bytes* and the compiler wasm. Names and bytes side by side, so
 * a custom font setup lives in one place.
 *
 * Like the other exporters, this is the full options shape; the
 * constructor takes a `Partial` of it and fills the defaults.
 */
export type PdfExporterOptions = TypstExporterOptions & {
  /**
   * The compiler wasm module: a URL (string or `URL`) or the module bytes.
   * Omitted, it loads from `@blocknote/xl-typst-compiler`'s own package
   * files (no CDN). Loaded once per page; the first exporter's value wins.
   *
   * Optional even in this full options shape: absence is not an unfilled
   * default but a complete configuration - resolution is delegated to the
   * wasm-bindgen glue's own module-relative URL, the one pattern bundlers
   * reliably detect and rewrite (a value computed here couldn't be).
   */
  wasm?: TypstCompileOptions["wasm"];
  /**
   * The body fonts (as bytes, or a promise of them) the exporter's
   * `fontFamily` / `monoFontFamily` names resolve against. Defaults to the
   * bundled set matching the editor; to *extend* it, spread the exported
   * loader: `loadDefaultBodyFonts().then((f) => [...f, myCjkFont])`.
   * Typst selects fonts by the family name embedded in each file's own
   * name table; a referenced-but-missing family surfaces as an
   * `unknown font family` entry in the result's `compileWarnings`.
   */
  fonts: Uint8Array[] | Promise<Uint8Array[]>;
  /**
   * An emoji-capable font (or fonts) as bytes, or a promise of them -
   * what {@link TypstExporterOptions.emojiFontFamily} resolves against.
   * Defaults (independently of {@link fonts}) to the bundled Noto Color
   * Emoji. Browsers give the compiler no access to OS fonts, so without
   * one emoji render as missing glyphs (and fail PDF/UA).
   */
  emojiFont: Uint8Array | Uint8Array[] | Promise<Uint8Array | Uint8Array[]>;
};

/**
 * Per-export options for {@link PDFExporter.toPDF} - one bag, like the
 * other exporters' export methods: the per-document options (title,
 * language, page setup - {@link TypstDocumentOptions}) plus the per-export
 * compile inputs.
 */
export type PdfExportOptions = TypstDocumentOptions & {
  /**
   * Extra files to map into the compiler's virtual filesystem, keyed by
   * the Typst path referenced in the source - e.g. an image used by a
   * caller-supplied {@link TypstDocumentOptions.header}. The exporter's
   * own collected assets are merged in automatically.
   */
  assets?: TypstCompileOptions["assets"];
  /**
   * PDF creation timestamp in seconds since the Unix epoch (UTC). Pass a
   * fixed value for byte-reproducible output; omitted means no timestamp.
   */
  creationTimestamp?: number;
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
   * Attempting the claim requires the document's language (the export
   * options' `lang`) - the one conformance input only the caller can
   * provide - and throws without it.
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
 * The outcome of {@link PDFExporter.toPDF}. A document that fails to
 * compile is an expected outcome (the source is generated from user
 * content: text no supplied font covers, broken caller-supplied
 * header/footer markup, ...), so it's a value carrying the compiler's
 * diagnostics - not an exception.
 */
export type PdfExportResult =
  | {
      error?: undefined;
      /** The PDF bytes. */
      bytes: Uint8Array;
      /**
       * The same PDF as a Blob (e.g. for downloads / object URLs).
       * Created lazily on first access - constructing a Blob copies the
       * bytes, so results that only use `bytes` never pay for it.
       */
      readonly blob: Blob;
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
 * Zero-config exports match the editor: the constructor's `fonts` and
 * `emojiFont` each default (independently) to the bundled set - Inter,
 * Geist Mono, New Computer Modern Math resp. Noto Color Emoji - loaded
 * lazily from the package, and the compiler wasm loads from its own
 * package's files. Pass a value (or an explicit `[]` for no fonts) to take
 * over either; see {@link PdfExporterOptions}.
 *
 * (The previous react-pdf based exporter is still available from
 * `@blocknote/xl-pdf-exporter/react-pdf` during its deprecation window.)
 */
export class PDFExporter<
  B extends BlockSchema,
  S extends StyleSchema,
  I extends InlineContentSchema,
> extends TypstExporter<B, S, I> {
  private readonly wasm: TypstCompileOptions["wasm"];
  private readonly fonts: Promise<Uint8Array[]>;
  private readonly emojiFont: Promise<Uint8Array | Uint8Array[]>;

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
    options?: Partial<PdfExporterOptions>,
  ) {
    const { wasm, fonts, emojiFont, ...typstOptions } = options ?? {};
    super(schema, mappings, {
      // The bundled default fonts (see `defaultFonts.ts`) include Noto
      // Color Emoji; declaring the family by default lets multi-codepoint
      // emoji shape correctly with zero config. Spread-defaulting is
      // deliberate here (unlike the base's per-key defaults): an explicit
      // `emojiFontFamily: undefined` *unsets* the family - a legitimate
      // state when supplying custom fonts without an emoji face, where a
      // dangling default reference would only produce warning noise.
      emojiFontFamily: DEFAULT_EMOJI_FONT_FAMILY,
      ...typstOptions,
    });
    this.wasm = wasm;
    // Zero-config fonts: each option defaults independently to the bundled
    // set matching the editor - `undefined` means "use the default", a
    // supplied value (including an explicit `[]` for none) takes over. The
    // independence keeps the bytes consistent with the constructor's
    // independent `emojiFontFamily` default: custom body fonts don't
    // silently drop emoji support, and vice versa. Values may be promises
    // (the constructor stays sync); they resolve on first export.
    this.fonts =
      fonts === undefined ? loadDefaultBodyFonts() : Promise.resolve(fonts);
    this.emojiFont =
      emojiFont === undefined
        ? loadDefaultEmojiFont()
        : Promise.resolve(emojiFont);
    // A caller-supplied promise may reject before the first export awaits
    // it; these no-op handlers keep that from surfacing as an unhandled
    // rejection (the export still rejects with the real error).
    this.fonts.catch(() => {});
    this.emojiFont.catch(() => {});
  }

  /**
   * Export a document to PDF: BlockNote document -> Typst -> tagged PDF
   * (wasm), declared PDF/UA-1 when the document conforms (see
   * {@link PdfExportOptions.tryDeclarePdfUA}). The counterpart of the
   * inherited {@link TypstExporter.toTypst}.
   *
   * The result carries the PDF as both bytes and a Blob, and reports
   * whether the conformance claim was made (and the violations when it
   * wasn't) - or, for a document that fails to compile at all, the
   * compiler's diagnostics (see {@link PdfExportResult}).
   */
  public async toPDF(
    blocks: Block<B, I, S>[],
    options: PdfExportOptions = {},
  ): Promise<PdfExportResult> {
    const {
      tryDeclarePdfUA = true,
      assets,
      creationTimestamp,
      ...documentOptions
    } = options;
    // Attempting the claim without a document language is a caller-args
    // error (like the asset collision below), not a document
    // nonconformity: the PDF would otherwise carry Typst's silently
    // defaulted language (English), and a wrong `/Lang` (e.g. "en" on a
    // German document) is an accessibility defect no validator can catch.
    // Unlike heading structure or alt text - content the end user can fix -
    // the language is an integration-time decision only the caller can
    // make, so it fails loudly (and first) at development time instead of
    // quietly producing forever-unclaimed exports.
    if (tryDeclarePdfUA && !options.lang) {
      throw new Error(
        "PDFExporter: declaring PDF/UA-1 (tryDeclarePdfUA, the default) " +
          "requires the document's language - pass its BCP-47 tag in the " +
          'export options (e.g. { lang: "en" }), or opt out of the ' +
          "claim with tryDeclarePdfUA: false.",
      );
    }
    const typst = await this.toTypst(blocks, documentOptions);
    // The images collected during the export are mapped into the compiler
    // alongside (not instead of) any assets the caller supplied - e.g. an
    // image referenced from the header/footer markup. A caller asset under
    // the exporter's own key space would be silently shadowed by the merge,
    // so that's rejected loudly instead (a programmer error, not an
    // expected outcome - hence a throw, unlike compile failures).
    for (const key of assets?.keys() ?? []) {
      if (this.assetFiles.has(key)) {
        throw new Error(
          `PDFExporter: the caller-supplied asset "${key}" collides with an ` +
            `asset registered by the exporter - use a path outside /assets/`,
        );
      }
    }
    const [fonts, emojiFont] = await Promise.all([this.fonts, this.emojiFont]);
    const resolved: TypstCompileOptions = {
      wasm: this.wasm,
      fonts,
      emojiFont,
      creationTimestamp,
      assets: new Map([...(assets ?? []), ...this.assetFiles]),
    };

    if (!tryDeclarePdfUA) {
      return withPdfUA(await compileTypstToPdf(typst, resolved), {
        declared: false,
        reason: "tryDeclarePdfUA-disabled",
      });
    }

    const declared = await compileTypstToPdf(typst, {
      ...resolved,
      pdfStandard: "ua-1",
    });
    if (!declared.error) {
      return exported(
        declared.pdf,
        { declared: true },
        declared.compileWarnings,
      );
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
}

function withPdfUA(
  compiled: Awaited<ReturnType<typeof compileTypstToPdf>>,
  pdfUA: PdfUAResult,
): PdfExportResult {
  if (compiled.error) {
    return compiled;
  }
  return exported(compiled.pdf, pdfUA, compiled.compileWarnings);
}

function exported(
  bytes: Uint8Array,
  pdfUA: PdfUAResult,
  compileWarnings: TypstDiagnostic[],
): PdfExportResult {
  let blob: Blob | undefined;
  return {
    bytes,
    // Constructing a Blob copies the bytes, so it's deferred to first
    // access (and memoized for a stable identity).
    get blob() {
      // The pipeline always returns a view over a plain (non-shared)
      // buffer; the cast narrows `ArrayBufferLike` for `BlobPart`.
      return (blob ??= new Blob([bytes as Uint8Array<ArrayBuffer>], {
        type: "application/pdf",
      }));
    },
    pdfUA,
    compileWarnings,
  };
}
