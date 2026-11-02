import type { TextFormat } from "./types.js";

/**
 * HTML, with the external HTML exporter and the HTML parser of BlockNote.
 * HTML shows more than markdown (for example colors, alignment and
 * underline), but the exporter also loses some data.
 */
export const htmlFormat: TextFormat = {
  serialize: (editor, blocks) => editor.blocksToHTMLLossy([...blocks]),
  parse: (editor, text) => editor.tryParseHTMLToBlocks(text),
};
