import { combineTransactionSteps as replayTransactionSteps } from "@tiptap/core";
import type { Node } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import type { Transform } from "prosemirror-transform";

/**
 * Tiptap's `combineTransactionSteps`, but a single transaction that starts at
 * `oldDoc` is returned as it is. Replaying its steps into a new transform
 * took seconds for a version diff, which has thousands of steps.
 *
 * The result can be the transaction itself, so it only gives what callers
 * read: adding steps to it would change that transaction.
 */
export function combineTransactionSteps(
  oldDoc: Node,
  transactions: readonly Transaction[],
): Pick<Transform, "before" | "doc" | "mapping" | "steps"> {
  if (transactions.length === 1 && transactions[0].before === oldDoc) {
    return transactions[0];
  }
  return replayTransactionSteps(oldDoc, [...transactions]);
}
