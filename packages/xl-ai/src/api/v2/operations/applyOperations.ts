import {
  blockToNode,
  docToBlocks,
  getBlockInfoAt,
  inlineContentToNodes,
  type PartialBlock,
  updateBlockTr,
} from "@blocknote/core";
import { Fragment, type Node } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";

import {
  isTableContent,
  type LensPartialBlock,
  type LensTableContent,
} from "../model.js";
import { applyStructure } from "./applyStructure.js";
import { applyToBlocks } from "./applyToBlocks.js";
import { addInlineContentSteps } from "./inlineSteps.js";
import type { BlockOperation } from "./types.js";

/**
 * Applies the operations to the document of a ProseMirror transaction. The
 * document can come from an editor or from a Y.Doc.
 *
 * The operations change only what they must. Thus, data that is not in the
 * Block JSON stays, for example comments:
 * - An update changes the block in place: inline content through the
 *   smallest ProseMirror steps (see `addInlineContentSteps`).
 * - The inserts, the moves and the removals give the structure of the
 *   result (see `applyToBlocks`). In each list of children, each run of
 *   changed children is replaced in one step (see `applyStructure`), with
 *   the ProseMirror nodes of the blocks that the document has (a moved
 *   block keeps its node, with its comments) and new nodes. Only a list
 *   that must have children and has none gets the fill of the schema.
 *
 * The operations must be possible in sequence, as `computeOperations` gives
 * them: each block that an operation refers to is in the document at that
 * point. Else the function throws (see `applyToBlocks`), and the
 * transaction must not be dispatched.
 *
 * The document must have one block for each ID (else `applyToBlocks`
 * throws). An update cannot change a block between a layout block (for
 * example a column) and a block with content: core throws for it. For
 * such a change, `computeOperations` gives the block a new ID: a removal
 * and an insert (see `newIdsForLayoutChanges`, also for the alternative).
 *
 * A block that the fill of the schema adds gets its ID from the ID extension
 * of the editor, when the transaction applies. The caller dispatches the
 * transaction. Thus, a caller can show the steps as suggestions, for
 * example. Note: for an editor that is bound to a Y.Doc,
 * use `updateDocument` or `updateYDoc`. y-prosemirror v13
 * can write a change into a different block if one transaction has inserts
 * and other changes (see `dispatchUpdate`).
 */
export function applyOperations(
  tr: Transaction,
  operations: readonly BlockOperation[],
): void {
  const updates = operations.flatMap((operation) =>
    operation.type === "update" ? [operation] : [],
  );
  if (updates.length > 0) {
    updateBlocks(tr, updates);
  }
  if (updates.length < operations.length) {
    applyStructure(tr, applyToBlocks(docToBlocks(tr.doc), operations));
  }
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
      if (positions.has(node.attrs.id)) {
        throw new Error(`Block ${node.attrs.id} is already in the document`);
      }
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
  if (!info.hasContent || target === null) {
    return false;
  }
  const table = info.content.node;
  const cells = tableCells(table, info.content.beforePos + 1);
  const targetCells = tableCells(target, 0);
  // The same rows, and the same cells in them: each with the same type and
  // the same number of paragraphs.
  if (
    table.childCount !== target.childCount ||
    cells.length !== targetCells.length ||
    cells.some(
      ({ node, row }, i) =>
        row !== targetCells[i].row ||
        node.type !== targetCells[i].node.type ||
        node.childCount !== targetCells[i].node.childCount,
    )
  ) {
    return false;
  }
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

/**
 * The cells of a table node, in document order, with their positions and the
 * index of their row. `start` is the position of the start of the table
 * content.
 */
function tableCells(table: Node, start: number) {
  const cells: { node: Node; pos: number; row: number }[] = [];
  table.forEach((row, rowOffset, rowIndex) => {
    row.forEach((cell, cellOffset) => {
      // The row starts at `start + rowOffset`; its content starts one later.
      cells.push({
        node: cell,
        pos: start + rowOffset + 1 + cellOffset,
        row: rowIndex,
      });
    });
  });
  return cells;
}
