import { ResolvedPos, type Node } from "prosemirror-model";
import { TextSelection, type Transaction } from "prosemirror-state";
import { ReplaceAroundStep } from "prosemirror-transform";
import type { Block, PartialBlock } from "../../../../blocks/defaultBlocks.js";
import type {
  BlockIdentifier,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import { getBlockInfoFromResolvedPos } from "../../../getBlockInfoFromPos.js";
import { blockToNode } from "../../../nodeConversions/blockToNode.js";
import { nodeToBlock } from "../../../nodeConversions/nodeToBlock.js";
import { getPmSchema } from "../../../pmUtil.js";
import {
  getParentBlockInfo,
  getPrevBlockInfo,
} from "../mergeBlocks/mergeBlocks.js";

// TODO: Where should this function go?
/**
 * Moves the first block in a column to the previous/next column and handles
 * all necessary collapsing of `column`/`columnList` nodes. Only moves the
 * block to the start of the next column if it's in the first column.
 * Otherwise, moves the block to the end of the previous column.
 * @param tr The transaction to apply changes to.
 * @param blockBeforePos The position just before the first block in the column.
 * @returns The position just before the block, after it's moved.
 */
export function moveFirstBlockInColumn(
  tr: Transaction,
  blockBeforePos: ResolvedPos,
): ResolvedPos {
  const blockInfo = getBlockInfoFromResolvedPos(blockBeforePos);
  if (!blockInfo.isBlockContainer) {
    throw new Error(
      "Invalid blockBeforePos: does not point to blockContainer node.",
    );
  }

  const prevBlockInfo = getPrevBlockInfo(tr.doc, blockInfo.bnBlock.beforePos);
  if (prevBlockInfo) {
    throw new Error(
      "Invalid blockBeforePos: does not point to first blockContainer node in column.",
    );
  }

  const parentBlockInfo = getParentBlockInfo(
    tr.doc,
    blockInfo.bnBlock.beforePos,
  );
  if (parentBlockInfo?.blockNoteType !== "column") {
    throw new Error(
      "Invalid blockBeforePos: blockContainer node is not child of column.",
    );
  }

  const column = parentBlockInfo;
  const columnList = getParentBlockInfo(tr.doc, column.bnBlock.beforePos);
  if (columnList?.blockNoteType !== "columnList") {
    throw new Error(
      "Invalid blockBeforePos: blockContainer node is child of column, but column is not child of columnList node.",
    );
  }

  const shouldRemoveColumn = column.childContainer!.node.childCount === 1;

  const shouldRemoveColumnList =
    shouldRemoveColumn && columnList.childContainer!.node.childCount === 2;

  const isFirstColumn =
    columnList.childContainer!.node.firstChild === column.bnBlock.node;

  const blockToMove = tr.doc.slice(
    blockInfo.bnBlock.beforePos,
    blockInfo.bnBlock.afterPos,
    false,
  );

  /*
  There are 3 different cases:
  a) remove entire column list (if no columns would be remaining)
  b) remove just a column (if no blocks inside a column would be remaining)
  c) keep columns (if there are blocks remaining inside a column)

  Each of these 3 cases has 2 sub-cases, depending on whether the backspace happens at the start of the first (most-left) column,
  or at the start of a non-first column.
  */
  if (shouldRemoveColumnList) {
    if (isFirstColumn) {
      tr.step(
        new ReplaceAroundStep(
          // replace entire column list
          columnList.bnBlock.beforePos,
          columnList.bnBlock.afterPos,
          // select content of remaining column:
          column.bnBlock.afterPos + 1,
          columnList.bnBlock.afterPos - 2,
          blockToMove,
          blockToMove.size, // append existing content to blockToMove
          false,
        ),
      );
      const pos = tr.doc.resolve(columnList.bnBlock.beforePos);
      tr.setSelection(TextSelection.between(pos, pos));

      return pos;
    } else {
      // replaces the column list with the blockToMove slice, prepended with the content of the remaining column
      tr.step(
        new ReplaceAroundStep(
          // replace entire column list
          columnList.bnBlock.beforePos,
          columnList.bnBlock.afterPos,
          // select content of existing column:
          columnList.bnBlock.beforePos + 2,
          column.bnBlock.beforePos - 1,
          blockToMove,
          0, // prepend existing content to blockToMove
          false,
        ),
      );
      const pos = tr.doc.resolve(tr.mapping.map(column.bnBlock.beforePos - 1));
      tr.setSelection(TextSelection.between(pos, pos));

      return pos;
    }
  } else if (shouldRemoveColumn) {
    if (isFirstColumn) {
      // delete column
      tr.delete(column.bnBlock.beforePos, column.bnBlock.afterPos);

      // move before columnlist
      tr.insert(columnList.bnBlock.beforePos, blockToMove.content);

      const pos = tr.doc.resolve(columnList.bnBlock.beforePos);
      tr.setSelection(TextSelection.between(pos, pos));

      return pos;
    } else {
      // just delete the </column><column> closing and opening tags to merge the columns
      tr.delete(column.bnBlock.beforePos - 1, column.bnBlock.beforePos + 1);
      const pos = tr.doc.resolve(column.bnBlock.beforePos - 1);

      return pos;
    }
  } else {
    // delete block
    tr.delete(blockInfo.bnBlock.beforePos, blockInfo.bnBlock.afterPos);
    if (isFirstColumn) {
      // move before columnlist
      tr.insert(columnList.bnBlock.beforePos - 1, blockToMove.content);
    } else {
      // append block to previous column
      tr.insert(column.bnBlock.beforePos - 1, blockToMove.content);
    }
    const pos = tr.doc.resolve(column.bnBlock.beforePos - 1);
    tr.setSelection(TextSelection.between(pos, pos));

    return pos;
  }
}

/**
 * Checks if a `column` node is empty, i.e. if it has only a single empty
 * block.
 * @param column The column to check.
 * @returns Whether the column is empty.
 */
function isEmptyColumn(column: Node) {
  if (!column || column.type.name !== "column") {
    throw new Error("Invalid columnPos: does not point to column node.");
  }

  const blockContainer = column.firstChild;
  if (!blockContainer) {
    throw new Error("Invalid column: does not have child node.");
  }

  const blockContent = blockContainer.firstChild;
  if (!blockContent) {
    throw new Error("Invalid blockContainer: does not have child node.");
  }

  return (
    column.childCount === 1 &&
    blockContainer.childCount === 1 &&
    blockContent.type.spec.content === "inline*" &&
    blockContent.content.content.length === 0
  );
}

/**
 * Removes all empty `column` nodes in a `columnList`. A `column` node is empty
 * if it has only a single empty block. If, however, removing the `column`s
 * leaves the `columnList` that has fewer than two, ProseMirror will re-add
 * empty columns.
 * @param tr The `Transaction` to add the changes to.
 * @param columnListPos The position just before the `columnList` node.
 */
function removeEmptyColumns(tr: Transaction, columnListPos: number) {
  const $columnListPos = tr.doc.resolve(columnListPos);
  const columnList = $columnListPos.nodeAfter;
  if (!columnList || columnList.type.name !== "columnList") {
    throw new Error(
      "Invalid columnListPos: does not point to columnList node.",
    );
  }

  for (
    let columnIndex = columnList.childCount - 1;
    columnIndex >= 0;
    columnIndex--
  ) {
    const columnPos = tr.doc
      .resolve($columnListPos.pos + 1)
      .posAtIndex(columnIndex);
    const $columnPos = tr.doc.resolve(columnPos);
    const column = $columnPos.nodeAfter;
    if (!column || column.type.name !== "column") {
      throw new Error("Invalid columnPos: does not point to column node.");
    }

    if (isEmptyColumn(column)) {
      tr.delete(columnPos, columnPos + column?.nodeSize);
    }
  }
}

/**
 * Fixes potential issues in a `columnList` node after a
 * `blockContainer`/`column` node is (re)moved from it:
 *
 * - Removes all empty `column` nodes. A `column` node is empty if it has only
 * a single empty block.
 * - If all but one `column` nodes are empty, replaces the `columnList` with
 * the content of the non-empty `column`.
 * - If all `column` nodes are empty, removes the `columnList` entirely.
 * @param tr The `Transaction` to add the changes to.
 * @param columnListPos
 * @returns The position just before the `columnList` node.
 */
export function fixColumnList(tr: Transaction, columnListPos: number) {
  removeEmptyColumns(tr, columnListPos);

  const $columnListPos = tr.doc.resolve(columnListPos);
  const columnList = $columnListPos.nodeAfter;
  if (!columnList || columnList.type.name !== "columnList") {
    throw new Error(
      "Invalid columnListPos: does not point to columnList node.",
    );
  }

  if (columnList.childCount > 2) {
    return;
  }

  const firstColumnBeforePos = columnListPos + 1;
  const $firstColumnBeforePos = tr.doc.resolve(firstColumnBeforePos);
  const firstColumn = $firstColumnBeforePos.nodeAfter;
  const lastColumnAfterPos = columnListPos + columnList.nodeSize - 1;
  const $lastColumnAfterPos = tr.doc.resolve(lastColumnAfterPos);
  const lastColumn = $lastColumnAfterPos.nodeBefore;
  if (!firstColumn || !lastColumn) {
    throw new Error("Invalid columnList: does not have child node.");
  }

  const firstColumnEmpty = isEmptyColumn(firstColumn);
  const lastColumnEmpty = isEmptyColumn(lastColumn);

  if (firstColumnEmpty && lastColumnEmpty) {
    tr.delete(columnListPos, columnListPos + columnList.nodeSize);

    return;
  }

  if (firstColumnEmpty) {
    const lastColumnContent = tr.doc.slice(
      lastColumnAfterPos - lastColumn.nodeSize + 1,
      lastColumnAfterPos - 1,
    );

    tr.delete(columnListPos, columnListPos + columnList.nodeSize);
    tr.insert(columnListPos, lastColumnContent.content);

    return;
  }

  if (lastColumnEmpty) {
    const firstColumnContent = tr.doc.slice(
      firstColumnBeforePos + 1,
      firstColumnBeforePos + firstColumn.nodeSize - 1,
    );

    tr.delete(columnListPos, columnListPos + columnList.nodeSize);
    tr.insert(columnListPos, firstColumnContent.content);

    return;
  }
}

export function removeAndInsertBlocks<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  tr: Transaction,
  blocksToRemove: BlockIdentifier[],
  blocksToInsert: PartialBlock<BSchema, I, S>[],
): {
  insertedBlocks: Block<BSchema, I, S>[];
  removedBlocks: Block<BSchema, I, S>[];
} {
  const pmSchema = getPmSchema(tr);
  // Converts the `PartialBlock`s to ProseMirror nodes to insert them into the
  // document.
  const nodesToInsert: Node[] = blocksToInsert.map((block) =>
    blockToNode(block, pmSchema),
  );

  const idsOfBlocksToRemove = new Set<string>(
    blocksToRemove.map((block) =>
      typeof block === "string" ? block : block.id,
    ),
  );
  const removedBlocks: Block<BSchema, I, S>[] = [];

  const idOfFirstBlock =
    typeof blocksToRemove[0] === "string"
      ? blocksToRemove[0]
      : blocksToRemove[0].id;
  let removedSize = 0;

  tr.doc.descendants((node, pos) => {
    // Skips traversing nodes after all target blocks have been removed.
    if (idsOfBlocksToRemove.size === 0) {
      return false;
    }

    // Keeps traversing nodes if block with target ID has not been found.
    if (
      !node.type.isInGroup("bnBlock") ||
      !idsOfBlocksToRemove.has(node.attrs.id)
    ) {
      return true;
    }

    // Saves the block that is being deleted.
    removedBlocks.push(nodeToBlock(node, pmSchema));
    idsOfBlocksToRemove.delete(node.attrs.id);

    if (blocksToInsert.length > 0 && node.attrs.id === idOfFirstBlock) {
      const oldDocSize = tr.doc.nodeSize;
      tr.insert(pos, nodesToInsert);
      const newDocSize = tr.doc.nodeSize;

      removedSize += oldDocSize - newDocSize;
    }

    const oldDocSize = tr.doc.nodeSize;

    const $pos = tr.doc.resolve(pos - removedSize);
    if (
      node.type.name === "column" &&
      node.attrs.id !== $pos.nodeAfter?.attrs.id
    ) {
      // This is a hacky work around to handle removing all columns in a
      // columnList. This is what happens when removing the last 2 columns:
      //
      // 1. The second-to-last `column` is removed.
      // 2. `fixColumnList` runs, removing the `columnList` and inserting the
      // contents of the last column in its place.
      // 3. `removedSize` increases not just by the size of the second-to-last
      // `column`, but also by the positions removed due to running
      // `fixColumnList`. Some of these positions are after the contents of the
      // last `column`, namely just after the `column` and `columnList`.
      // 3. `tr.doc.descendants` traverses to the last `column`.
      // 4. `removedSize` now includes positions that were removed after the
      // last `column`. This causes `pos - removedSize` to point to an
      // incorrect position, as it expects that the difference in document size
      // accounted for by `removedSize` comes before the block being removed.
      // 5. The deletion is offset by 3, because of those removed positions
      // included in `removedSize` that occur after the last `column`.
      //
      // Hence why we have to shift the start of the deletion range back by 3.
      // The offset for the end of the range is smaller as `node.nodeSize` is
      // the size of the second `column`. Since it's been removed, we actually
      // care about the size of its children - a difference of 2 positions.
      tr.delete(pos - removedSize + 3, pos - removedSize + node.nodeSize + 1);
    } else if (
      $pos.node().type.name === "blockGroup" &&
      $pos.node($pos.depth - 1).type.name !== "doc" &&
      $pos.node().childCount === 1
    ) {
      // Checks if the block is the only child of a parent `blockGroup` node.
      // In this case, we need to delete the parent `blockGroup` node instead
      // of just the `blockContainer`.
      tr.delete($pos.before(), $pos.after());
    } else {
      tr.delete(pos - removedSize, pos - removedSize + node.nodeSize);
    }

    if ($pos.node().type.name === "column") {
      fixColumnList(tr, $pos.before(-1));
    } else if ($pos.node().type.name === "columnList") {
      fixColumnList(tr, $pos.before());
    }

    const newDocSize = tr.doc.nodeSize;
    removedSize += oldDocSize - newDocSize;

    return false;
  });

  // Throws an error if not all blocks could be found.
  if (idsOfBlocksToRemove.size > 0) {
    const notFoundIds = [...idsOfBlocksToRemove].join("\n");

    throw Error(
      "Blocks with the following IDs could not be found in the editor: " +
        notFoundIds,
    );
  }

  // Converts the nodes created from `blocksToInsert` into full `Block`s.
  const insertedBlocks = nodesToInsert.map((node) =>
    nodeToBlock(node, pmSchema),
  ) as Block<BSchema, I, S>[];

  return { insertedBlocks, removedBlocks };
}
