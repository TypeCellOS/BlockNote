import type { BlockNoteEditor } from "@blocknote/core";
import type { Node } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import {
  AddMarkStep,
  RemoveMarkStep,
  ReplaceStep,
  type Step,
} from "prosemirror-transform";

import { dispatchToEditor } from "../operations/applyOperations.js";

/**
 * Dispatches the steps of the transaction to the editor, in transactions in
 * which no two steps change the same text block.
 *
 * For each transaction, y-prosemirror writes one diff for each text block:
 * from the first changed character to the last. Thus, for a paragraph with
 * two changes in one transaction, it replaces the text between them, and
 * Yjs then moves or duplicates a change of another writer there. With one
 * change for each text block in a transaction, each diff is as small as its
 * step, as for a user who types.
 *
 * `tr` must be a transaction of the current state of the editor.
 */
export function dispatchSteps(
  editor: BlockNoteEditor<any, any, any>,
  tr: Transaction,
) {
  let group: Step[] = [];
  // The start of each text block that the group changes, in the document
  // after the steps of the group.
  let changed: number[] = [];
  tr.steps.forEach((step, index) => {
    const textBlock = textBlockOf(tr.docs[index], step);
    if (textBlock !== undefined && changed.includes(textBlock)) {
      dispatchToEditor(editor, group);
      group = [];
      changed = [];
    }
    group.push(step);
    const map = step.getMap();
    changed = changed.map((pos) => map.map(pos, -1));
    if (textBlock !== undefined) {
      changed.push(map.map(textBlock, -1));
    }
  });
  dispatchToEditor(editor, group);
}

/**
 * The start of the content of the text block that contains the full range of
 * the step, in `doc` (the document before the step). `undefined` for a step
 * that is not in one text block, for example the insert of a block.
 */
function textBlockOf(doc: Node, step: Step): number | undefined {
  if (
    !(
      step instanceof ReplaceStep ||
      step instanceof AddMarkStep ||
      step instanceof RemoveMarkStep
    )
  ) {
    return undefined;
  }
  const $from = doc.resolve(step.from);
  return $from.parent.isTextblock && step.to <= $from.end()
    ? $from.start()
    : undefined;
}
