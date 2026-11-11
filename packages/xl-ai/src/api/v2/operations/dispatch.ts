import type { BlockNoteEditor } from "@blocknote/core";
import type { Node } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import {
  AddMarkStep,
  AttrStep,
  Mapping,
  RemoveMarkStep,
  ReplaceAroundStep,
  ReplaceStep,
  type Step,
  Transform,
} from "prosemirror-transform";

/**
 * Dispatches the steps of a write to the editor. For an editor that is bound
 * to a Y.Doc (it has the "ySync" extension), see {@link dispatchSteps}. For
 * another editor, one transaction: thus, one undo reverts the write.
 *
 * `tr` must be a transaction of the current state of the editor.
 */
export function dispatchUpdate(
  editor: BlockNoteEditor<any, any, any>,
  tr: Transaction,
) {
  if (editor.getExtension("ySync") === undefined) {
    dispatchToEditor(editor, tr.steps);
  } else {
    dispatchSteps(editor, tr);
  }
}

/**
 * Dispatches the steps of the transaction to the editor, in transactions that
 * y-prosemirror writes to the Y.Doc without changes to other blocks:
 *
 * - A step that changes a list of children (for example the insert or the
 *   removal of blocks) goes alone. y-prosemirror compares a list of children
 *   only from its start and from its end. It writes the children between the
 *   first and the last change in place, one by one. Thus, with two changes
 *   in one list, or a change that inserts or removes children next to other
 *   changes, a block can get the content of a different block, and a change
 *   of another writer goes into the wrong block.
 * - The other steps (in a text block, or a change of the attributes or the
 *   type of one node, see `blockOf`) go in groups in which no two steps
 *   change the same block. For each transaction, y-prosemirror writes one diff for each text
 *   block: from the first changed character to the last. Thus, for a
 *   paragraph with two changes in one transaction, it replaces the text
 *   between them, and Yjs then moves or duplicates a change of another writer
 *   there. With one change for each text block in a transaction, each diff
 *   is as small as its step, as for a user who types.
 *
 * Between the transactions, plugins can change the document (for example
 * prosemirror-tables, or the unique ID extension). Then the steps after that
 * change move to the changed document (see `rebaseSteps`).
 *
 * `tr` must be a transaction of the current state of the editor.
 *
 * @internal
 */
export function dispatchSteps(
  editor: BlockNoteEditor<any, any, any>,
  tr: Transaction,
) {
  // The steps that are not sent yet: `pending.steps` from `start`.
  let pending: Transform = tr;
  let start = 0;
  while (start < pending.steps.length) {
    const end = groupEnd(pending, start);
    const added = sendGroup(editor, pending.steps.slice(start, end));
    if (added.length === 0) {
      start = end;
    } else {
      // A plugin changed the document after the group (for example
      // prosemirror-tables makes a table rectangular). The next steps then
      // apply to the changed document.
      const doc = editor.prosemirrorState.doc;
      const rest = rebaseSteps(pending, end, added, doc);
      pending = new Transform(doc);
      for (const step of rest) {
        pending.step(step);
      }
      start = 0;
    }
  }
}

/**
 * Dispatches the steps to the editor, in one transaction. The steps come
 * from a text or from operations, not from a user who types. Thus, the
 * transaction has the meta `preventAutolink`: the autolink plugin of the
 * editor must not change a URL of the text into a link.
 */
function dispatchToEditor(
  editor: BlockNoteEditor<any, any, any>,
  steps: readonly Step[],
) {
  if (steps.length === 0) {
    return;
  }
  editor.transact((tr) => {
    tr.setMeta("preventAutolink", true);
    for (const step of steps) {
      tr.step(step);
    }
  });
}

/** The end of the group of steps from `start` (see {@link dispatchSteps}). */
function groupEnd(pending: Transform, start: number): number {
  const changed = new Set<string>();
  for (let index = start; index < pending.steps.length; index++) {
    const block = blockOf(pending.docs[index], pending.steps[index]);
    if (block === undefined) {
      // A step that changes a list of children goes alone.
      return index === start ? index + 1 : index;
    }
    if (changed.has(block)) {
      return index;
    }
    changed.add(block);
  }
  return pending.steps.length;
}

/** Dispatches the steps in one transaction. Returns the steps that plugins added to it. */
function sendGroup(
  editor: BlockNoteEditor<any, any, any>,
  steps: readonly Step[],
): Step[] {
  const added: Step[] = [];
  function onTransaction(event: { appendedTransactions: Transaction[] }) {
    for (const appended of event.appendedTransactions) {
      for (const step of appended.steps) {
        added.push(step);
      }
    }
  }
  editor._tiptapEditor.on("transaction", onTransaction);
  try {
    dispatchToEditor(editor, steps);
  } finally {
    editor._tiptapEditor.off("transaction", onTransaction);
  }
  return added;
}

/**
 * Returns the steps of `pending` from `from`, changed to apply after the
 * steps `over` (which apply to the document `pending.docs[from]`), on the
 * document `doc` that they give. This is the method of prosemirror-collab:
 * the mapping goes back through the inverted steps, forward through `over`,
 * and each mapped step mirrors its inverted step. A step that cannot follow
 * the change of the plugin is an error: the write then does not apply (see
 * `updateYDoc`).
 */
function rebaseSteps(
  pending: Transform,
  from: number,
  over: readonly Step[],
  doc: Node,
): Step[] {
  const mapping = new Mapping();
  for (let index = pending.steps.length - 1; index >= from; index--) {
    mapping.appendMap(pending.steps[index].getMap().invert());
  }
  for (const step of over) {
    mapping.appendMap(step.getMap());
  }
  const check = new Transform(doc);
  const result: Step[] = [];
  let mapFrom = pending.steps.length - from;
  for (let index = from; index < pending.steps.length; index++) {
    const mapped = pending.steps[index].map(mapping.slice(mapFrom));
    mapFrom--;
    if (mapped === null || check.maybeStep(mapped).failed) {
      throw new Error("A step of the write cannot follow a change of a plugin");
    }
    mapping.appendMap(mapped.getMap(), mapFrom);
    result.push(mapped);
  }
  return result;
}

/**
 * The ID of the block that the step changes, if the step changes no list of
 * children, in `doc` (the document before the step): a step in one text
 * block, or a step that changes only the attributes or the type of one node
 * (for example the props of a block, or the color of a table cell).
 * `undefined` for another step, for example the insert of a block.
 */
function blockOf(doc: Node, step: Step): string | undefined {
  if (step instanceof AttrStep) {
    return blockAt(doc, step.pos);
  }
  if (
    step instanceof ReplaceAroundStep &&
    step.insert === 1 &&
    step.gapFrom === step.from + 1 &&
    step.gapTo === step.to - 1 &&
    doc.nodeAt(step.from)?.nodeSize === step.to - step.from
  ) {
    // The node at `from` gets a new type or new attributes (setNodeMarkup).
    return blockAt(doc, step.from);
  }
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
  return blockAt(doc, step.from);
}

/** The ID of the block of the node at `pos`, or of the block that contains it. */
function blockAt(doc: Node, pos: number): string | undefined {
  const node = doc.nodeAt(pos);
  if (node?.type.isInGroup("bnBlock")) {
    return node.attrs.id;
  }
  const $pos = doc.resolve(pos);
  for (let depth = $pos.depth; depth > 0; depth--) {
    const ancestor = $pos.node(depth);
    if (ancestor.type.isInGroup("bnBlock")) {
      return ancestor.attrs.id;
    }
  }
  return undefined;
}
