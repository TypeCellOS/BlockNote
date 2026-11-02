import type { BlockNoteEditor } from "@blocknote/core";

import type { TextFormat } from "../formats/types.js";

/** The maximum number of round trips to get the canonical form. */
const MAX_ROUND_TRIPS = 5;

/**
 * Returns the canonical form of a text in the format: the result of round
 * trips (parse, then serialize) until the text does not change.
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
    const next = format.serialize(editor, format.parse(editor, current));
    if (next === current) {
      return current;
    }
    current = next;
  }
  return current;
}
