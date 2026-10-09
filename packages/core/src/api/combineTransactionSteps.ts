import { combineTransactionSteps as replayTransactionSteps } from "@tiptap/core";
import type { Node } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import type { Transform } from "prosemirror-transform";

/**
 * Tiptap's `combineTransactionSteps`, but a single transaction that starts at
 * `oldDoc` is returned as it is. Replaying its steps into a new transform
 * took seconds for a version diff, which has thousands of steps.
 *
 * The result can be the transaction itself, so don't add steps to it.
 */
export function combineTransactionSteps(
  oldDoc: Node,
  transactions: readonly Transaction[],
): Transform {
  if (transactions.length === 1 && transactions[0].before === oldDoc) {
    return transactions[0];
  }
  return replayTransactionSteps(oldDoc, [...transactions]);
}
