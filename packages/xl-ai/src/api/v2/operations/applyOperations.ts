import {
  type BlockNoteEditor,
  getBlockInfoAt,
  getInsertionPos,
  getNodeById,
  inlineContentToNodes,
  insertBlocks,
  type PartialBlock,
  removeAndInsertBlocks,
  updateBlockTr,
} from "@blocknote/core";
import { Fragment, Slice } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import { ReplaceStep, type Step } from "prosemirror-transform";

import type { LensPartialBlock } from "../blocks/types.js";
import { addInlineContentSteps } from "./inlineSteps.js";
import type { BlockOperation } from "./types.js";

/**
 * Applies the operations to the editor in sequence, in one transaction.
 * Returns the ProseMirror steps of the transaction.
 */
export function applyBlockOperations(
  editor: BlockNoteEditor<any, any, any>,
  operations: readonly BlockOperation[],
): readonly Step[] {
  if (operations.length === 0) {
    return [];
  }
  return editor.transact((tr) => {
    applyOperations(tr, operations);
    return [...tr.steps];
  });
}

/**
 * Applies the operations to the document of a ProseMirror transaction, in
 * sequence. The document can come from an editor or from a Y.Doc.
 *
 * The operations change only what they must. Thus, data that is not in the
 * Block JSON stays, for example comments:
 * - Inline content changes through the smallest ProseMirror steps (see
 *   `addInlineContentSteps`).
 * - A move moves the ProseMirror node of the block, with its children.
 */
export function applyOperations(
  tr: Transaction,
  operations: readonly BlockOperation[],
): void {
  for (const operation of operations) {
    switch (operation.type) {
      case "update":
        updateBlock(tr, operation.id, operation.update);
        break;
      case "insert":
        insertBlocks(
          tr,
          [operation.block as PartialBlock],
          operation.reference,
          operation.placement,
        );
        break;
      case "move":
        moveBlock(tr, operation);
        break;
      case "delete":
        removeAndInsertBlocks(tr, [operation.id], []);
        break;
    }
  }
}

function find(tr: Transaction, id: string) {
  const found = getNodeById(id, tr.doc);
  if (found === undefined) {
    throw new Error(`Block ${id} is not in the document`);
  }
  return found;
}

/**
 * Updates a block. The type and props go through `updateBlockTr`. Inline
 * content goes through the smallest ProseMirror steps. Thus, text that did
 * not change keeps its identity and its comments.
 */
function updateBlock(tr: Transaction, id: string, update: LensPartialBlock) {
  const { content, ...fields } = update;
  if (fields.type !== undefined || fields.props !== undefined) {
    updateBlockTr(tr, find(tr, id).posBeforeNode, fields as PartialBlock);
  }
  if (!("content" in update)) {
    return;
  }

  const { posBeforeNode } = find(tr, id);
  const info = getBlockInfoAt(tr.doc, posBeforeNode);
  if (
    !Array.isArray(content) ||
    !info.hasContent ||
    !info.content.node.isTextblock
  ) {
    updateBlockTr(tr, posBeforeNode, { content } as PartialBlock);
    return;
  }
  const target = Fragment.from(
    inlineContentToNodes<any, any>(
      content,
      tr.doc.type.schema,
      info.content.node.type.name,
    ),
  );
  addInlineContentSteps(
    tr,
    info.content.beforePos + 1,
    info.content.node,
    target,
  );
}

/** Moves the ProseMirror node of a block (with its children) to the position. */
function moveBlock(
  tr: Transaction,
  operation: Extract<BlockOperation, { type: "move" }>,
) {
  const { node } = find(tr, operation.id);
  // Take the block out. Do not fix the layout blocks here, because the block
  // goes back into the document directly after this.
  removeAndInsertBlocks(tr, [operation.id], [], { fixLayoutBlocks: false });

  const reference = find(tr, operation.reference);
  const target = getInsertionPos(
    tr.doc,
    getBlockInfoAt(tr.doc, reference.posBeforeNode),
    operation.placement,
    node.type,
  );
  if (target === null) {
    throw new Error(
      `Block ${operation.id} cannot go ${operation.placement} block ${operation.reference}`,
    );
  }
  const fragment = Fragment.from(
    target.wrapIn === undefined ? node : target.wrapIn.create(null, node),
  );
  tr.step(new ReplaceStep(target.pos, target.pos, new Slice(fragment, 0, 0)));
}
