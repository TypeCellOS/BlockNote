import type { LensBlock } from "../model.js";
import { flattenBlocks, inlineContentToText } from "../util/blocks/index.js";
import type { TextFormat } from "./types.js";

/**
 * Plain text: the text of all blocks with inline content or plain content, in
 * document order. A blank line separates the blocks. A line break in a block
 * stays a single newline. A blank line in a block becomes a single newline:
 * else, the parse would read it as two blocks. Thus, the blank line is data
 * that this format does not show. The same applies to `\r\n` and `\r`: the
 * serialize and the parse read them as `\n` (see {@link newlines}).
 *
 * This format does not show other data: block types, props, styles, nesting,
 * and blocks without text (for example images, tables and empty paragraphs).
 * The parser makes a paragraph block from each paragraph of text.
 */
export const plainTextFormat: TextFormat = {
  serialize: (_editor, blocks) => blocksToPlainText(blocks),
  parse: (_editor, text) => plainTextToBlocks(text),
};

function blocksToPlainText(blocks: readonly LensBlock[]): string {
  const paragraphs: string[] = [];
  for (const { block } of flattenBlocks(blocks)) {
    if (!Array.isArray(block.content)) {
      continue;
    }
    const text = newlines(inlineContentToText(block.content)).replace(
      /\n(?:[ \t]*\n)+/g,
      "\n",
    );
    if (text.trim().length > 0) {
      paragraphs.push(text);
    }
  }
  return paragraphs.join("\n\n");
}

function plainTextToBlocks(text: string): LensBlock[] {
  return (
    newlines(text)
      // Lines with only white space at the start and at the end of the text
      // go, as between two blocks (see the split below). Thus, the text of a
      // block does not depend on the block after it.
      .replace(/^(?:[ \t]*\n)+|(?:\n[ \t]*)+$/g, "")
      .split(/\n(?:[ \t]*\n)+/)
      .filter((paragraph) => paragraph.trim().length > 0)
      .map((paragraph) => ({
        id: "",
        type: "paragraph",
        props: {},
        content: [{ type: "text", text: paragraph, styles: {} }],
        children: [],
      }))
  );
}

/**
 * The text with each `\r\n` and `\r` as `\n`. The serialize and the parse
 * must agree on what a line is: else, a blank line `\r\n\r\n` in a block is
 * not a blank line for the serialize, but two blocks for the parse.
 */
function newlines(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}
