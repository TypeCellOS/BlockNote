import {
  Block,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import {
  TypstDocumentOptions,
  TypstExporter,
} from "@blocknote/xl-typst-exporter";
import {
  compileTypstToTaggedPdf,
  TypstCompileOptions,
} from "./pdfua/compileBrowser.js";
import { declarePdfUA } from "./pdfua/postProcess.js";

// The Typst layer is re-exported so PDF consumers need only this package.
// The mappings passed to `PDFExporter` ARE Typst mappings - a custom block's
// single Typst mapping serves both the standalone `.typ` export
// (@blocknote/xl-typst-exporter) and the PDF export.
export * from "@blocknote/xl-typst-exporter";
export { declarePdfUA } from "./pdfua/postProcess.js";
export {
  compileTypstToTaggedPdf,
  type TypstCompileOptions,
} from "./pdfua/compileBrowser.js";

/** Options for {@link PDFExporter}'s export methods. */
export type PdfExportOptions = TypstCompileOptions & {
  /**
   * Declare PDF/UA-1 conformance on the produced document (the
   * `pdfuaid:part` XMP identifier plus `/ViewerPreferences/DisplayDocTitle`;
   * see {@link declarePdfUA}).
   *
   * The tagged structure tree is always emitted either way - this controls
   * only the conformance *claim*. Opt out when a document is known not to
   * conform (e.g. its first heading isn't level 1, or an image lacks any
   * caption/name to use as alt text): a tagged-but-unclaimed PDF is honest,
   * while a false claim fails validation. Either way, verify output with
   * veraPDF (`--flavour ua1`) in CI - the declaration does not itself
   * guarantee conformance of arbitrary input.
   *
   * @default true
   */
  declarePdfUA?: boolean;
};

/**
 * Exports BlockNote documents to accessible, tagged PDF/UA-1 files, powered
 * by Typst (compiled to wasm - the whole pipeline runs client-side).
 *
 * The mappings are *Typst* mappings ({@link typstDefaultSchemaMappings});
 * this class is a {@link TypstExporter} plus the PDF compile step, so
 * everything documented there applies - including that an exporter instance
 * accumulates assets for its lifetime: create a fresh exporter per export
 * when repeatedly exporting changing content (construction is cheap).
 *
 * Concurrency: the shared compile stage is serialized internally (see
 * `compileTypstToTaggedPdf`) and the asset registry is append-only, so
 * overlapping exports are *safe* - but like any async calls, independent
 * exports may complete out of call order. Callers that only want the newest
 * result (e.g. a live preview exporting on every change) should guard for
 * that themselves, as the pdf-ua example does.
 *
 * (The previous react-pdf based exporter is still available from
 * `@blocknote/xl-pdf-exporter/react-pdf` during its deprecation window.)
 */
export class PDFExporter<
  B extends BlockSchema,
  S extends StyleSchema,
  I extends InlineContentSchema,
> extends TypstExporter<B, S, I> {
  /**
   * Export a document to PDF bytes: BlockNote document -> Typst -> tagged
   * PDF (wasm) -> declared PDF/UA-1 (unless opted out via
   * {@link PdfExportOptions.declarePdfUA}).
   */
  public async toBytes(
    blocks: Block<B, I, S>[],
    options: PdfExportOptions,
    documentOptions?: TypstDocumentOptions,
  ): Promise<Uint8Array> {
    const { declarePdfUA: withDeclaration = true, ...compileOptions } = options;
    const typst = await this.toTypst(blocks, documentOptions);
    // The images collected during the export are mapped into the compiler
    // alongside (not instead of) any assets the caller supplied - e.g. an
    // image referenced from the header/footer markup. A caller asset under
    // the exporter's own key space would be silently shadowed by the merge,
    // so that's rejected loudly instead.
    for (const key of compileOptions.assets?.keys() ?? []) {
      if (this.assetFiles.has(key)) {
        throw new Error(
          `PDFExporter: the caller-supplied asset "${key}" collides with an ` +
            `asset registered by the exporter - use a path outside /assets/`,
        );
      }
    }
    const taggedPdf = await compileTypstToTaggedPdf(typst, {
      ...compileOptions,
      assets: new Map([...(compileOptions.assets ?? []), ...this.assetFiles]),
    });
    // TODO: collapse this into one step once the web compiler supports native
    // PDF/UA-1 export. typst's node compiler already accepts
    // `pdfStandard: "ua-1"`, which emits a veraPDF-conformant PDF/UA-1
    // directly (verified: 0 failed checks) and validates accessibility at
    // compile time (errors on missing alt text) — making `declarePdfUA` (and
    // the `@cantoo/pdf-lib` dependency) unnecessary. `@myriaddreamin/
    // typst.ts`'s browser `pdf()` does not yet expose a PDF standard option,
    // so the post-process is still required for the wasm path.
    return withDeclaration ? declarePdfUA(taggedPdf) : taggedPdf;
  }

  /** Export a document to a PDF Blob (e.g. for downloads / object URLs). */
  public async toBlob(
    blocks: Block<B, I, S>[],
    options: PdfExportOptions,
    documentOptions?: TypstDocumentOptions,
  ): Promise<Blob> {
    const bytes = await this.toBytes(blocks, options, documentOptions);
    // The pipeline always returns a view over a plain (non-shared) buffer;
    // the cast narrows `ArrayBufferLike` for `BlobPart`.
    return new Blob([bytes as Uint8Array<ArrayBuffer>], {
      type: "application/pdf",
    });
  }
}
