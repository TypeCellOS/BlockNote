import {
  type BlockNoteEditor,
  blockToNode,
  getBlockInfoAt,
  getInsertionPos,
  getNodeById,
  inlineContentToNodes,
  insertBlocks,
  type PartialBlock,
  removeAndInsertBlocks,
  updateBlockTr,
} from "@blocknote/core";
import { Fragment, type Node, Slice } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import { ReplaceStep, type Step } from "prosemirror-transform";

import {
  isTableContent,
  type LensPartialBlock,
  type LensTableContent,
} from "../blocks/types.js";
import { addMissingBlockIds } from "./blockIds.js";
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
 *
 * At the end, each block has an ID, also a block that ProseMirror made to
 * fill an empty group.
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
  addMissingBlockIds(tr);
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
  if (isTableContent(content) && updateTableCells(tr, posBeforeNode, content)) {
    return;
  }
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

/**
 * Updates a table cell by cell, if the new table has the same rows and cells
 * (the same number and the same cell types). A cell with changed attributes
 * (for example a color) gets the new attributes, and a cell with changed text
 * gets the smallest steps. Thus, comments in the cells stay. Returns false if
 * the tables do not have the same rows and cells. Then the caller replaces
 * the content.
 */
function updateTableCells(
  tr: Transaction,
  posBeforeNode: number,
  content: LensTableContent,
): boolean {
  const info = getBlockInfoAt(tr.doc, posBeforeNode);
  const target = blockToNode(
    { type: "table", content } as PartialBlock,
    tr.doc.type.schema,
  ).firstChild;
  if (
    !info.hasContent ||
    target === null ||
    !sameTableShape(info.content.node, target)
  ) {
    return false;
  }

  const cells = tableCells(info.content.node, info.content.beforePos + 1);
  const targetCells = tableCells(target, 0);
  // From the last cell to the first. Thus, a change does not move the
  // positions of the cells before it.
  for (let i = cells.length - 1; i >= 0; i--) {
    const { node, pos } = cells[i];
    const targetCell = targetCells[i].node;
    if (!node.sameMarkup(targetCell)) {
      tr.setNodeMarkup(pos, undefined, targetCell.attrs);
    }
    const paragraph = node.firstChild;
    const targetParagraph = targetCell.firstChild;
    if (paragraph !== null && targetParagraph !== null) {
      // The text starts after the open tokens of the cell and of its paragraph.
      addInlineContentSteps(tr, pos + 2, paragraph, targetParagraph.content);
    }
  }
  return true;
}

/** Returns true if two table nodes have the same rows, with the same number and types of cells. */
function sameTableShape(a: Node, b: Node): boolean {
  if (a.childCount !== b.childCount) {
    return false;
  }
  for (let r = 0; r < a.childCount; r++) {
    const rowA = a.child(r);
    const rowB = b.child(r);
    if (rowA.childCount !== rowB.childCount) {
      return false;
    }
    for (let c = 0; c < rowA.childCount; c++) {
      const cellA = rowA.child(c);
      const cellB = rowB.child(c);
      if (cellA.type !== cellB.type || cellA.childCount !== cellB.childCount) {
        return false;
      }
    }
  }
  return true;
}

/** The cells of a table node, in document order, with their positions. `start` is the position of the start of the table content. */
function tableCells(table: Node, start: number) {
  const cells: { node: Node; pos: number }[] = [];
  table.forEach((row, rowOffset) => {
    row.forEach((cell, cellOffset) => {
      // The row starts at `start + rowOffset`; its content starts one later.
      cells.push({ node: cell, pos: start + rowOffset + 1 + cellOffset });
    });
  });
  return cells;
}
