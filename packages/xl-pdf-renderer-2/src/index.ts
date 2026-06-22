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
import { TypstExporter } from "./typst/typstExporter.js";

export { TypstExporter } from "./typst/typstExporter.js";
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
): Promise<Uint8Array> {
  const typst = await exporter.toTypst(blocks);
  const taggedPdf = await compileTypstToTaggedPdf(typst, compileOptions);
  return declarePdfUA(taggedPdf);
}
