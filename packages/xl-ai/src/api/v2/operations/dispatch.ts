import type { BlockNoteEditor } from "@blocknote/core";
import type { Transaction } from "prosemirror-state";

/**
 * Dispatches the steps of a write to the editor, in one transaction. Thus,
 * one undo reverts the write.
 *
 * This is also correct for an editor that is bound to a Y.Doc with the Yjs
 * 14 binding of `@blocknote/core/y`. That binding writes the difference of
 * the document before and after the transaction to the Y.Doc, and it pairs
 * two blocks only if they have the same block ID (`blockMatchNodes` of
 * core). Thus, a change of another writer stays in its block (see
 * `dispatch.y.test.ts`).
 *
 * The steps come from a text or from operations, not from a user who types.
 * Thus, the transaction has the meta `preventAutolink`: the autolink plugin
 * of the editor must not change a URL of the text into a link.
 *
 * `tr` must be a transaction of the current state of the editor.
 */
export function dispatchUpdate(
  editor: BlockNoteEditor<any, any, any>,
  tr: Transaction,
) {
  if (tr.steps.length === 0) {
    return;
  }
  editor.transact((transaction) => {
    transaction.setMeta("preventAutolink", true);
    for (const step of tr.steps) {
      transaction.step(step);
    }
  });
}
