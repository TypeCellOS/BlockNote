import {
  Block,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import {
  compileTypstToTaggedPdf,
  TypstCompileOptions,
} from "./pdfua/compileBrowser.js";
import { declarePdfUA } from "./pdfua/postProcess.js";
import { TypstDocumentOptions, TypstExporter } from "./typst/typstExporter.js";

export {
  TypstExporter,
  type TypstDocumentOptions,
} from "./typst/typstExporter.js";
export * from "./typst/defaultSchema/index.js";
// Helpers for authors of custom Typst mappings (e.g. the math-block /
// diagram-block `typst-exporter` entry points): string literals and the
// shared error placeholder.
export { errorPlaceholder, strLit } from "./typst/util.js";
export { declarePdfUA } from "./pdfua/postProcess.js";
export {
  compileTypstToTaggedPdf,
  type TypstCompileOptions,
} from "./pdfua/compileBrowser.js";

/**
 * Full client-side pipeline: BlockNote document -> Typst -> tagged PDF (wasm)
 * -> declared PDF/UA-1.
 *
 * Concurrency: the shared compile stage is serialized internally (see
 * `compileTypstToTaggedPdf`) and the exporter's asset registry is
 * append-only, so overlapping exports are *safe* - but like any async
 * function, independent calls may complete out of call order. Callers that
 * only want the newest result (e.g. a live preview exporting on every
 * change) should guard for that themselves, as the pdf-ua example does.
 *
 * Exporter lifetime: the registry accumulates for as long as the exporter
 * lives, so when repeatedly exporting *changing* content, create a fresh
 * exporter per export (construction is cheap) rather than reusing one -
 * see the note on `TypstExporter`'s asset registry.
 *
 * Always verify output with veraPDF (`--flavour ua1`) in CI — this composes a
 * conformant document but does not itself guarantee conformance of arbitrary
 * input (e.g. a figure missing alt text). To produce a tagged PDF *without*
 * the conformance claim (e.g. when a document is known not to conform, such
 * as images lacking alt text), compose the steps yourself: `toTypst` +
 * `compileTypstToTaggedPdf`, skipping `declarePdfUA`.
 */
export async function blocksToPdfUA<
  B extends BlockSchema,
  S extends StyleSchema,
  I extends InlineContentSchema,
>(
  exporter: TypstExporter<B, S, I>,
  blocks: Block<B, I, S>[],
  compileOptions: TypstCompileOptions,
  documentOptions?: TypstDocumentOptions,
): Promise<Uint8Array> {
  const typst = await exporter.toTypst(blocks, documentOptions);
  // The images collected during the export are mapped into the compiler
  // alongside (not instead of) any assets the caller supplied - e.g. an
  // image referenced from the header/footer markup. A caller asset under the
  // exporter's own key space would be silently shadowed by the merge, so
  // that's rejected loudly instead.
  for (const key of compileOptions.assets?.keys() ?? []) {
    if (exporter.assetFiles.has(key)) {
      throw new Error(
        `blocksToPdfUA: the caller-supplied asset "${key}" collides with an ` +
          `asset registered by the exporter - use a path outside /assets/`,
      );
    }
  }
  const taggedPdf = await compileTypstToTaggedPdf(typst, {
    ...compileOptions,
    assets: new Map([...(compileOptions.assets ?? []), ...exporter.assetFiles]),
  });
  // TODO: collapse this into one step once the web compiler supports native
  // PDF/UA-1 export. typst's node compiler already accepts `pdfStandard: "ua-1"`,
  // which emits a veraPDF-conformant PDF/UA-1 directly (verified: 0 failed
  // checks) and validates accessibility at compile time (errors on missing alt
  // text) — making `declarePdfUA` (and the `@cantoo/pdf-lib` dependency) unnecessary.
  // `@myriaddreamin/typst.ts`'s browser `pdf()` does not yet expose a PDF
  // standard option, so the post-process is still required for the wasm path.
  return declarePdfUA(taggedPdf);
}
