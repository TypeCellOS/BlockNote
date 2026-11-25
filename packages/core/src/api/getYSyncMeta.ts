import type { Transaction } from "prosemirror-state";

/**
 * Returns the meta that the sync plugin of y-prosemirror sets on each
 * transaction that it applies to the editor (for example the change of another
 * client), or `undefined` for a transaction without it.
 */
export function getYSyncMeta(
  transaction: Transaction,
): { isUndoRedoOperation?: boolean } | undefined {
  // y-prosemirror stores the meta under its plugin key, which this code cannot
  // import (y-prosemirror is an optional dependency). The text of a plugin key
  // depends on the page: ProseMirror gives the first key with the name
  // "y-sync" the text "y-sync$", and the second one "y-sync$1".
  // `@y/prosemirror` (Yjs 14) also makes a key with that name, so
  // y-prosemirror has the second text in a page that loaded `@y/prosemirror`
  // first.
  return transaction.getMeta("y-sync$") ?? transaction.getMeta("y-sync$1");
}
