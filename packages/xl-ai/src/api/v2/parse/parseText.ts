import type { BlockNoteEditor } from "@blocknote/core";

import type { LensBlock } from "../blocks/index.js";
import { type TextFormat, toStoredBlocks } from "../formats/index.js";

/**
 * Parses a text in the format, into the blocks in the form that the document
 * stores them (see `toStoredBlocks`). The text of the document (the view of
 * stage 1) and the text of a client (stage 2) both use this parse. Thus, the
 * two sides of the alignment are in the same form. If the blocks do not fit
 * the schema, the result is the error `"invalid-document"`.
 */
export function parseText(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  text: string,
): { error?: undefined; blocks: LensBlock[] } | { error: "invalid-document" } {
  const blocks = toStoredBlocks(editor, format.parse(editor, text));
  return blocks === undefined ? { error: "invalid-document" } : { blocks };
}

/**
 * Returns the text without a byte order mark at its start (for example of a
 * file): the mark is not content, unless the text of the document starts
 * with that character.
 */
export function withoutByteOrderMark(
  text: string,
  documentText: string,
): string {
  return text.startsWith("\uFEFF") && !documentText.startsWith("\uFEFF")
    ? text.slice(1)
    : text;
}
