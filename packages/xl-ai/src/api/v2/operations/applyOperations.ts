import {
  type BlockNoteEditor,
  type BlockPlacement,
  blockToNode,
  getBlockInfoAt,
  getInsertionPos,
  getNodeById,
  inlineContentToNodes,
  insertBlocks,
  type PartialBlock,
  updateBlockTr,
} from "@blocknote/core";
import { Fragment, type Node, Slice } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import { ReplaceStep, type Step } from "prosemirror-transform";

import {
  isTableContent,
  type LensBlock,
  type LensPartialBlock,
  type LensTableContent,
} from "../blocks/types.js";
import { addMissingBlockIds } from "./blockIds.js";
import { addInlineContentSteps } from "./inlineSteps.js";
import type { BlockOperation, BlockPosition } from "./types.js";

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
  // The blocks that the document has after the operations: the blocks of
  // the document now (each with an ID), and the inserted blocks. Another
  // block is a block that core or ProseMirror made to fill a parent (see
  // `removeFillBlocks`).
  addMissingBlockIds(tr);
  const expected = blockIdsOf(tr.doc);
  for (const operation of operations) {
    if (operation.type === "insert") {
      addIds(operation.block, expected);
    }
  }

  for (let index = 0; index < operations.length; index++) {
    const operation = operations[index];
    switch (operation.type) {
      case "update": {
        const run: Extract<BlockOperation, { type: "update" }>[] = [];
        while (operations[index]?.type === "update") {
          run.push(operations[index] as (typeof run)[number]);
          index++;
        }
        index--;
        updateBlocks(tr, run);
        break;
      }
      case "insert": {
        const { reference, placement } = resolvePosition(tr, operation);
        insertBlocks(
          tr,
          [operation.block as PartialBlock],
          reference,
          placement,
        );
        break;
      }
      case "move":
        moveBlock(tr, operation);
        break;
      case "delete": {
        // Not `removeAndInsertBlocks`: it needs an ID on each block, and
        // its layout repair also removes a column with only an empty
        // paragraph, which the target can keep.
        const { node, posBeforeNode } = find(tr, operation.id);
        removeAt(tr, posBeforeNode, posBeforeNode + node.nodeSize);
        break;
      }
    }
  }
  removeFillBlocks(tr, expected);
  addMissingBlockIds(tr);
}

/** The IDs of all the blocks of the document. */
function blockIdsOf(doc: Node): Set<string> {
  const ids = new Set<string>();
  doc.descendants((node) => {
    if (node.type.isInGroup("bnBlock") && typeof node.attrs.id === "string") {
      ids.add(node.attrs.id);
    }
    return !node.isTextblock;
  });
  return ids;
}

function addIds(block: LensBlock, ids: Set<string>) {
  ids.add(block.id);
  for (const child of block.children) {
    addIds(child, ids);
  }
}

/** Returns true for a block that core or ProseMirror made to fill a parent (see `applyOperations`). */
function isFill(node: Node, expected: ReadonlySet<string>): boolean {
  return (
    node.type.isInGroup("bnBlock") &&
    (typeof node.attrs.id !== "string" || !expected.has(node.attrs.id))
  );
}

/**
 * Removes the fill blocks that their parent does not need. Core and
 * ProseMirror fill a block with too few children with new blocks, for
 * example a new column list before the moves of its columns (core
 * `blockToNode` gives it two new columns). After the moves, the column list
 * does not need them.
 */
function removeFillBlocks(tr: Transaction, expected: ReadonlySet<string>) {
  const fills: number[] = [];
  tr.doc.descendants((node, pos) => {
    if (isFill(node, expected)) {
      fills.push(pos);
    }
    return !node.isTextblock;
  });
  // From the end: a block is after its parent. Thus, the children go first,
  // and the positions before each removal stay correct.
  for (const pos of fills.reverse()) {
    const $pos = tr.doc.resolve(pos);
    const node = $pos.nodeAfter;
    if (node && $pos.parent.canReplace($pos.index(), $pos.index() + 1)) {
      tr.delete(pos, pos + node.nodeSize);
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
 * Applies a run of updates. An update does not change the structure of the
 * document. It changes only the positions after the start of its block.
 * Thus, one walk of the document gives the position of each block, and the
 * updates apply from the last block to the first: then each position stays
 * correct. This is linear in the size of the document.
 */
function updateBlocks(
  tr: Transaction,
  updates: readonly Extract<BlockOperation, { type: "update" }>[],
) {
  const positions = new Map<string, number>();
  tr.doc.descendants((node, pos) => {
    if (node.type.isInGroup("bnBlock") && typeof node.attrs.id === "string") {
      positions.set(node.attrs.id, pos);
    }
    // The text of a block contains no blocks.
    return !node.isTextblock;
  });
  const withPositions = updates.map((update) => {
    const pos = positions.get(update.id);
    if (pos === undefined) {
      throw new Error(`Block ${update.id} is not in the document`);
    }
    return { pos, update: update.update };
  });
  withPositions.sort((a, b) => b.pos - a.pos);
  for (const { pos, update } of withPositions) {
    updateBlock(tr, pos, update);
  }
}

/**
 * Updates the block at `posBeforeNode`. The type and props go through
 * `updateBlockTr`. Inline content goes through the smallest ProseMirror
 * steps. Thus, text that did not change keeps its identity and its comments.
 * The block keeps its start position.
 */
function updateBlock(
  tr: Transaction,
  posBeforeNode: number,
  update: LensPartialBlock,
) {
  const { content, ...fields } = update;
  if (
    fields.type !== undefined &&
    changesContentKind(tr, posBeforeNode, fields.type)
  ) {
    // For example a paragraph that becomes a table: the new type needs its
    // content in the same change.
    updateBlockTr(tr, posBeforeNode, update as PartialBlock);
    return;
  }
  if (fields.type !== undefined || fields.props !== undefined) {
    updateBlockTr(tr, posBeforeNode, fields as PartialBlock);
  }
  if (!("content" in update)) {
    return;
  }

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

/**
 * Returns true if the block at the position and the new type do not both
 * have inline content (for example a paragraph and a table).
 */
function changesContentKind(
  tr: Transaction,
  posBeforeNode: number,
  type: string,
): boolean {
  const info = getBlockInfoAt(tr.doc, posBeforeNode);
  const current = info.hasContent ? info.content.node : undefined;
  const next = tr.doc.type.schema.nodes[type];
  return !(current?.isTextblock && next?.isTextblock);
}

/** Moves the ProseMirror node of a block (with its children) to the position. */
function moveBlock(
  tr: Transaction,
  operation: Extract<BlockOperation, { type: "move" }>,
) {
  const { node, posBeforeNode } = find(tr, operation.id);
  const { reference: referenceId, placement } = resolvePosition(tr, operation);
  const reference = find(tr, referenceId);
  const target = getInsertionPos(
    tr.doc,
    getBlockInfoAt(tr.doc, reference.posBeforeNode),
    placement,
    node.type,
  );
  if (target === null) {
    throw new Error(
      `Block ${operation.id} cannot go ${placement} block ${referenceId}`,
    );
  }
  // Put the block at its new position first, and then take it out at its old
  // position. Between the two steps, the block is in the document two times.
  // Thus, its old parent never has too few children. With the other order,
  // the removal of a column from a column list with two columns gives a
  // column list with one column, and ProseMirror adds a new empty column.
  const fragment = Fragment.from(
    target.wrapIn === undefined ? node : target.wrapIn.create(null, node),
  );
  tr.step(new ReplaceStep(target.pos, target.pos, new Slice(fragment, 0, 0)));
  const insert = tr.mapping.maps[tr.mapping.maps.length - 1];
  removeAt(
    tr,
    insert.map(posBeforeNode, 1),
    insert.map(posBeforeNode + node.nodeSize, -1),
  );
}

/**
 * Removes the block from `from` to `to`. If it is the only child of a nested
 * block group, the group goes too, as in `removeAndInsertBlocks`.
 */
function removeAt(tr: Transaction, from: number, to: number) {
  const $from = tr.doc.resolve(from);
  if (
    $from.parent.type.name === "blockGroup" &&
    $from.node($from.depth - 1).type.name !== "doc" &&
    $from.parent.childCount === 1
  ) {
    tr.delete($from.before(), $from.after());
  } else {
    tr.delete(from, to);
  }
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

/**
 * Returns the position relative to a block. The start of the document is the
 * position before the first top-level block. A BlockNote document always has
 * one, also a document that ProseMirror filled.
 */
function resolvePosition(
  tr: Transaction,
  position: BlockPosition,
): { reference: string; placement: BlockPlacement } {
  if (position.placement !== "start") {
    return position;
  }
  const first = tr.doc.firstChild?.firstChild;
  const id: unknown = first?.attrs.id;
  if (typeof id !== "string") {
    throw new Error("The document has no first block with an ID");
  }
  return { reference: id, placement: "before" };
}
