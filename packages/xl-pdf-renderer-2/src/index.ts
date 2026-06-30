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
export { declarePdfUA } from "./pdfua/postProcess.js";
export {
  compileTypstToTaggedPdf,
  type TypstCompileOptions,
} from "./pdfua/compileBrowser.js";

/**
 * Full client-side pipeline: BlockNote document -> Typst -> tagged PDF (wasm)
 * -> declared PDF/UA-1.
 *
 * Always verify output with veraPDF (`--flavour ua1`) in CI — this composes a
 * conformant document but does not itself guarantee conformance of arbitrary
 * input (e.g. a figure missing alt text).
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
  const taggedPdf = await compileTypstToTaggedPdf(typst, {
    ...compileOptions,
    // Images collected during the export must be mapped into the compiler.
    assets: exporter.assetFiles,
  });
  // TODO: collapse this into one step once the web compiler supports native
  // PDF/UA-1 export. typst's node compiler already accepts `pdfStandard: "ua-1"`,
  // which emits a veraPDF-conformant PDF/UA-1 directly (verified: 0 failed
  // checks) and validates accessibility at compile time (errors on missing alt
  // text) — making `declarePdfUA` (and the `pdf-lib` dependency) unnecessary.
  // `@myriaddreamin/typst.ts`'s browser `pdf()` does not yet expose a PDF
  // standard option, so the post-process is still required for the wasm path.
  return declarePdfUA(taggedPdf);
}
