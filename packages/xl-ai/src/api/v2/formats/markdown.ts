import type { TextFormat } from "./types.js";

/** Markdown, with the markdown exporter and parser of BlockNote. The exporter loses some data. */
export const markdownFormat: TextFormat = {
  serialize: (editor, blocks) => editor.blocksToMarkdownLossy([...blocks]),
  parse: (editor, text) => editor.tryParseMarkdownToBlocks(text),
};
