import {
  type Block,
  type BlockNoteEditor,
  docToBlocks,
  getNodeById,
  insertBlocks,
  nodeToBlock,
  type PartialBlock,
  removeAndInsertBlocks,
  UnreachableCaseError,
} from "@blocknote/core";
import type { ForkYDocExtension } from "@blocknote/core/yjs";
import {
  revertSuggestions,
  transformToSuggestionTransaction,
} from "@handlewithcare/prosemirror-suggest-changes";
import type { Mark, Node } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";

import {
  applyOperations,
  type BlockOperation,
  type BlockPosition,
} from "@blocknote/xl-ai/text-lens";
import {
  blockOf,
  type DerivedSuggestions,
  UNATTRIBUTED_SUGGESTION,
} from "../proposal/derive.js";
import { blockIdsOf } from "../proposal/proposal.js";
import { SUGGESTION_MARK_NAMES } from "../stores/yjsGuard.js";

/** The marks of `AIExtension` that show a suggestion. */
const SUGGESTION_MARKS = new Set<string>(SUGGESTION_MARK_NAMES);

/**
 * The meta of a transaction that shows or removes the display of a
 * proposal. Only these transactions can change a document that shows a
 * proposal (see the plugin of `DocumentAgentExtension`).
 */
export const DISPLAY_META = "blocknote-document-agent-display";

/**
 * Marks a transaction as a change of the display, not of the main
 * document:
 *
 * - It is not a step of the undo history.
 * - The editor does not tell `editor.onChange` about it (`preventUpdate`
 *   of Tiptap). Thus, an app that saves the document after each change
 *   does not get a document with suggestion marks.
 */
function asDisplay(tr: Transaction): Transaction {
  return tr
    .setMeta("addToHistory", false)
    .setMeta("preventUpdate", true)
    .setMeta(DISPLAY_META, true);
}

/**
 * Throws if the document of the editor has suggestion marks. The code of
 * the document agent calls it before each step that reads the editor as
 * the main document, or writes to it. Suggestion marks in the main
 * document are a bug: the text of a proposal that no user accepted would
 * become a part of the document.
 */
export function assertNoSuggestions(
  editor: BlockNoteEditor<any, any, any>,
  step: string,
): void {
  if (hasSuggestions(editor.prosemirrorState.doc)) {
    throw new Error(
      `${step}: the document of the editor has suggestion marks. It is not the main document.`,
    );
  }
}

/**
 * The main document of the editor: the document without the suggestions of
 * a proposal. Use it to save the document. `editor.document` is not safe
 * for that while the editor shows a proposal: Block JSON does not have the
 * suggestion marks, thus it has the inserted text and the deleted text as
 * normal text.
 *
 * For an editor that is bound to a Y.Doc, this is the document at the
 * start of the display: the shared Y.Doc is the main document there.
 */
export function mainDocumentOf(
  editor: BlockNoteEditor<any, any, any>,
): Block<any, any, any>[] {
  const state = editor.prosemirrorState;
  if (!hasSuggestions(state.doc)) {
    return editor.document;
  }
  let reverted: Node | undefined;
  revertSuggestions(state, (tr) => {
    reverted = tr.doc;
  });
  if (reverted === undefined || hasSuggestions(reverted)) {
    throw new Error("The suggestions of the document did not revert");
  }
  return docToBlocks(reverted);
}

/** Returns true if a node in the document has a suggestion mark. */
export function hasSuggestions(doc: Node): boolean {
  let found = false;
  doc.descendants((node) => {
    if (node.marks.some((mark) => SUGGESTION_MARKS.has(mark.type.name))) {
      found = true;
    }
    return !found;
  });
  return found;
}

/**
 * Removes the display of a proposal. After it, the editor shows the main
 * document.
 *
 * For an editor that is bound to a Y.Doc, the display is in a local fork
 * of the Y.Doc. The shared document never has suggestion marks.
 */
export function clearSuggestions(editor: BlockNoteEditor<any, any, any>): void {
  const fork = editor.getExtension<typeof ForkYDocExtension>("yForkDoc");
  if (fork?.store.state.isForked) {
    fork.merge({ keepChanges: false });
    return;
  }
  if (hasSuggestions(editor.prosemirrorState.doc)) {
    editor.exec((state, dispatch) =>
      revertSuggestions(state, (tr) => dispatch?.(asDisplay(tr))),
    );
  }
}

/**
 * Shows the derived changes of a proposal as suggestion marks. The editor
 * must show the main document, without suggestions (see
 * {@link clearSuggestions}). For an editor that is bound to a Y.Doc, the
 * marks go into a local fork.
 *
 * The ID of each suggestion mark identifies the tool call that changed its
 * block (see `suggestionIdOf`). Thus, the review finds the suggestions of a
 * tool call, and the reason of the call for each suggestion.
 */
export function showSuggestions(
  editor: BlockNoteEditor<any, any, any>,
  derived: DerivedSuggestions,
): void {
  if (derived.operations.length === 0) {
    return;
  }
  const fork = editor.getExtension<typeof ForkYDocExtension>("yForkDoc");
  fork?.fork();
  if (
    editor.getExtension("ySync") !== undefined &&
    fork?.store.state.isForked !== true
  ) {
    // Without a fork, the suggestion marks go into the shared Y.Doc, and
    // each user gets them as a part of the document.
    throw new Error(
      "The editor is bound to a Y.Doc, and has no fork of it: a proposal cannot show",
    );
  }
  const suggestionIds = suggestionIdOfEachBlock(derived);
  editor.exec((state, dispatch) => {
    const tr = state.tr;
    // An update changes a block in place, with the smallest steps (one step
    // for each changed run of text). The suggestion transform marks only
    // the text of these steps.
    applyOperations(
      tr,
      derived.operations.filter((operation) => operation.type === "update"),
    );
    for (const operation of derived.operations) {
      applyStructureOperation(tr, operation);
    }
    const suggestionTr = asDisplay(
      transformToSuggestionTransaction(tr, state),
    ).setMeta("preventAutolink", true);
    // The transform moves the selection to the last deletion. Keep the
    // selection of the user.
    suggestionTr.setSelection(
      state.selection.map(suggestionTr.doc, suggestionTr.mapping),
    );
    setSuggestionIds(suggestionTr, suggestionIds);
    dispatch?.(suggestionTr);
    return true;
  });
}

/** The suggestion ID of each block that the derived operations change or add. */
function suggestionIdOfEachBlock(
  derived: DerivedSuggestions,
): Map<string, number> {
  const ids = new Map<string, number>();
  derived.operations.forEach((operation, index) => {
    const id = derived.suggestionIds[index];
    ids.set(blockOf(operation), id);
    if (operation.type === "insert") {
      for (const blockId of blockIdsOf([operation.block])) {
        ids.set(blockId, id);
      }
    }
  });
  return ids;
}

/**
 * Gives each suggestion mark the ID of the tool call of its block: the
 * block that has the mark, or the nearest block around it that a tool call
 * changed.
 *
 * The suggestion transform gives IDs for each step. It does not tell which
 * step gets which ID. Thus, this function sets the IDs after the transform.
 */
function setSuggestionIds(tr: Transaction, ids: Map<string, number>) {
  const changes: { pos: number; node: Node; mark: Mark; next: Mark }[] = [];
  tr.doc.descendants((node, pos) => {
    for (const mark of node.marks) {
      if (!SUGGESTION_MARKS.has(mark.type.name)) {
        continue;
      }
      const id = suggestionIdAt(tr.doc, pos, node, ids);
      if (mark.attrs.id !== id) {
        changes.push({
          pos,
          node,
          mark,
          next: mark.type.create({ ...mark.attrs, id }),
        });
      }
    }
    return true;
  });
  // A change of a mark does not move a position.
  for (const { pos, node, mark, next } of changes) {
    if (node.isInline) {
      tr.removeMark(pos, pos + node.nodeSize, mark);
      tr.addMark(pos, pos + node.nodeSize, next);
    } else {
      tr.removeNodeMark(pos, mark);
      tr.addNodeMark(pos, next);
    }
  }
}

/** The suggestion ID of the node at a position: of the node, or of the nearest block around it. */
function suggestionIdAt(
  doc: Node,
  pos: number,
  node: Node,
  ids: Map<string, number>,
): number {
  const $pos = doc.resolve(pos);
  const candidates = [node];
  for (let depth = $pos.depth; depth > 0; depth--) {
    candidates.push($pos.node(depth));
  }
  for (const candidate of candidates) {
    const blockId: unknown = candidate.attrs.id;
    const id = typeof blockId === "string" ? ids.get(blockId) : undefined;
    if (id !== undefined) {
      return id;
    }
  }
  return UNATTRIBUTED_SUGGESTION;
}

/**
 * Applies an insert, a move or a delete with one step for each block.
 * `applyOperations` replaces each run of changed blocks in one step. The
 * suggestion transform then marks all blocks of that run as deleted and
 * inserted. The updates are already in the transaction.
 */
function applyStructureOperation(tr: Transaction, operation: BlockOperation) {
  switch (operation.type) {
    case "update":
      return;
    case "insert":
      insertAt(tr, [operation.block], operation);
      return;
    case "move": {
      // In a suggestion, a move is a deletion at the old position and an
      // insertion at the new position.
      const found = getNodeById(operation.id, tr.doc);
      if (found === undefined) {
        throw new Error(`Block ${operation.id} is not in the document`);
      }
      const block = nodeToBlock(found.node, tr.doc);
      removeAndInsertBlocks(tr, [operation.id], [], {
        fixLayoutBlocks: false,
      });
      insertAt(tr, [block], operation);
      return;
    }
    case "delete":
      // The operations of the lens already fix the layout blocks.
      removeAndInsertBlocks(tr, [operation.id], [], {
        fixLayoutBlocks: false,
      });
      return;
    default:
      throw new UnreachableCaseError(operation);
  }
}

function insertAt(
  tr: Transaction,
  blocks: PartialBlock<any, any, any>[],
  position: BlockPosition,
) {
  if (position.placement !== "start") {
    insertBlocks(tr, blocks, position.reference, position.placement);
    return;
  }
  const firstId: unknown = tr.doc.firstChild?.firstChild?.attrs.id;
  if (typeof firstId !== "string") {
    throw new Error("The document has no first block");
  }
  insertBlocks(tr, blocks, firstId, "before");
}
