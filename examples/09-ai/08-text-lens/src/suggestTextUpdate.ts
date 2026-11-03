import {
  type BlockNoteEditor,
  getNodeById,
  insertBlocks,
  nodeToBlock,
  type PartialBlock,
  removeAndInsertBlocks,
  UnreachableCaseError,
} from "@blocknote/core";
import {
  applyBlockOperations,
  type BlockOperation,
  type BlockPosition,
  computeTextUpdate,
  type TextUpdate,
  type TextUpdateOptions,
} from "@blocknote/xl-ai/text-lens";
import {
  revertSuggestions,
  transformToSuggestionTransaction,
} from "@handlewithcare/prosemirror-suggest-changes";
import type { Node } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import { Step } from "prosemirror-transform";

/** The marks of `AIExtension` that show a suggestion. */
const SUGGESTION_MARKS = new Set(["insertion", "deletion", "modification"]);

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
 * Writes a text to the editor as suggestions. The steps are:
 *
 * 1. Revert the suggestions of the last write. A deletion stays in the
 *    document until a user accepts it. Thus, without this step, the lens
 *    reads the deleted text as content.
 * 2. Copy the clean document to `scratch`, and compute the update there.
 * 3. Apply the operations to the editor in one transaction, as suggestions.
 *
 * `scratch` is an editor without a view, with the schema of `editor`. It
 * supplies the ProseMirror steps of the updates. `applyBlockOperations`
 * dispatches its steps. Thus, it cannot write to `editor` directly.
 */
export function suggestTextUpdate(
  editor: BlockNoteEditor<any, any, any>,
  scratch: BlockNoteEditor<any, any, any>,
  options: TextUpdateOptions,
): TextUpdate {
  if (hasSuggestions(editor.prosemirrorState.doc)) {
    editor.exec((state, dispatch) =>
      revertSuggestions(state, (tr) =>
        dispatch?.(tr.setMeta("addToHistory", false)),
      ),
    );
  }

  copyDocument(editor, scratch);
  const update = computeTextUpdate(scratch, options);
  if (update.error !== undefined || update.operations.length === 0) {
    return update;
  }

  // An update changes a block in place, with the smallest steps (one step
  // for each changed run of text). The suggestion transform marks only the
  // text of these steps.
  const updateSteps = applyBlockOperations(
    scratch,
    update.operations.filter((operation) => operation.type === "update"),
  ).map((step) => Step.fromJSON(editor.pmSchema, step.toJSON()));

  editor.exec((state, dispatch) => {
    const tr = state.tr;
    for (const step of updateSteps) {
      tr.step(step);
    }
    for (const operation of update.operations) {
      applyStructureOperation(tr, operation);
    }
    const suggestionTr = transformToSuggestionTransaction(tr, state)
      .setMeta("addToHistory", false)
      .setMeta("preventAutolink", true);
    // The transform moves the selection to the last deletion. Keep the
    // selection of the user.
    suggestionTr.setSelection(
      state.selection.map(suggestionTr.doc, suggestionTr.mapping),
    );
    dispatch?.(suggestionTr);
    return true;
  });
  return update;
}

/**
 * Makes the document of `scratch` equal to the document of `editor`. The
 * two editors have different schema objects. Thus, the copy goes through
 * JSON.
 */
function copyDocument(
  editor: BlockNoteEditor<any, any, any>,
  scratch: BlockNoteEditor<any, any, any>,
) {
  const doc = scratch.pmSchema.nodeFromJSON(
    editor.prosemirrorState.doc.toJSON(),
  );
  scratch.transact((tr) => {
    tr.replaceWith(0, tr.doc.content.size, doc.content);
  });
  if (!scratch.prosemirrorState.doc.eq(doc)) {
    throw new Error("The scratch editor changed the copy of the document");
  }
}

/**
 * Applies an insert, a move or a delete with one step for each block.
 * `applyBlockOperations` replaces a full block group in one step. The
 * suggestion transform then marks all blocks of that group as deleted and
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
