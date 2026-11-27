import type { Transaction } from "prosemirror-state";

/**
 * Returns the meta that y-prosemirror sets on each transaction that it applies
 * to the editor, or `undefined`.
 */
export function getYSyncMeta(
  transaction: Transaction,
): { isUndoRedoOperation?: boolean } | undefined {
  // The key is "y-sync$1" if the page loaded `@y/prosemirror` (Yjs 14) first.
  // Mostly a test run does that: it has the two bindings in one page.
  return transaction.getMeta("y-sync$") ?? transaction.getMeta("y-sync$1");
}
