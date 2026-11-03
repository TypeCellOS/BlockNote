import type { BlockNoteEditor } from "@blocknote/core";

import { toStoredBlocks } from "../formats/stored.js";
import type { TextFormat } from "../formats/types.js";

/** The maximum number of round trips to get the canonical form. */
const MAX_ROUND_TRIPS = 5;

/**
 * Returns the canonical form of a text in the format: the result of round
 * trips (parse to the form that the document stores, then serialize) until
 * the text does not change. The stored form is the form of a write (see
 * `toStoredBlocks`): for example, a table with a short row gets empty cells.
 *
 * One round trip is not always sufficient. For example, the markdown parser
 * adds a space after a hard break. At the end of a paragraph, the serializer
 * writes this space on a line of its own, and the next parse changes the hard
 * break to a backslash character. Two texts are equal for the format if their
 * canonical forms are equal.
 */
export function canonicalText(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  text: string,
): string {
  let current = text;
  for (let i = 0; i < MAX_ROUND_TRIPS; i++) {
    const parsed = format.parse(editor, current);
    const next = format.serialize(
      editor,
      toStoredBlocks(editor, parsed) ?? parsed,
    );
    if (next === current) {
      return current;
    }
    current = next;
  }
  return current;
}
