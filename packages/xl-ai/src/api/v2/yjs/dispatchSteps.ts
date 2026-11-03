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
 * Dispatches the steps of the transaction to the editor, in transactions that
 * y-prosemirror writes to the Y.Doc without changes to other blocks:
 *
 * - A step that is not in one text block (for example the insert or the
 *   removal of blocks) goes alone. y-prosemirror compares a list of children
 *   only from its start and from its end. It writes the children between the
 *   first and the last change in place, one by one. Thus, with two changes
 *   in one list, or a change that inserts or removes children next to other
 *   changes, a block can get the content of a different block, and a change
 *   of another writer goes into the wrong block.
 * - The other steps go in groups in which no two steps change the same
 *   block. For each transaction, y-prosemirror writes one diff for each text
 *   block: from the first changed character to the last. Thus, for a
 *   paragraph with two changes in one transaction, it replaces the text
 *   between them, and Yjs then moves or duplicates a change of another writer
 *   there. With one change for each text block in a transaction, each diff
 *   is as small as its step, as for a user who types.
 *
 * `tr` must be a transaction of the current state of the editor.
 */
export function dispatchSteps(
  editor: BlockNoteEditor<any, any, any>,
  tr: Transaction,
) {
  let group: Step[] = [];
  const changed = new Set<string>();
  function send() {
    if (group.length > 0) {
      dispatchToEditor(editor, group);
    }
    group = [];
    changed.clear();
  }
  tr.steps.forEach((step, index) => {
    const block = textBlockOf(tr.docs[index], step);
    if (block === undefined || changed.has(block)) {
      send();
    }
    group.push(step);
    if (block === undefined) {
      send();
    } else {
      changed.add(block);
    }
  });
  send();
}

/**
 * The ID of the block whose text block contains the full range of the step,
 * in `doc` (the document before the step). `undefined` for a step that is not
 * in one text block, for example the insert of a block.
 */
function textBlockOf(doc: Node, step: Step): string | undefined {
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
  if (!$from.parent.isTextblock || step.to > $from.end()) {
    return undefined;
  }
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.isInGroup("bnBlock")) {
      return node.attrs.id;
    }
  }
  return undefined;
}
