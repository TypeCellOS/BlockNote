import { Fragment, ResolvedPos, Slice, type Node } from "prosemirror-model";
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
    if ($pos.node().type.name === "column" && $pos.node().childCount === 1) {
      // Checks if the block is the only child of a parent `column` node. In
      // this case, we need to collapse the `column` or parent `columnList`,
      // depending on if the `columnList` has more than 2 children. This is
      // handled by `moveFirstBlockInColumn`.
      const $newPos = moveFirstBlockInColumn(tr, $pos);
      // Instead of deleting it, `moveFirstBlockInColumn` moves the block in
      // order to handle the columns after, so we have to delete it manually.
      tr.replace(
        $newPos.pos,
        $newPos.pos + $newPos.nodeAfter!.nodeSize,
        Slice.empty,
      );
    } else if (
      $pos.node().type.name === "columnList" &&
      $pos.node().childCount === 2
    ) {
      // Checks whether removing the entire column would leave only a single
      // remaining `column` node in the columnList. In this case, we need to
      // collapse the column list.
      const column = getBlockInfoFromResolvedPos($pos);
      if (column.blockNoteType !== "column") {
        throw new Error(
          `Invalid block: ${column.blockNoteType} was found as child of columnList.`,
        );
      }
      const columnList = getParentBlockInfo(tr.doc, column.bnBlock.beforePos);
      if (!columnList) {
        throw new Error(
          `Invalid block: column was found without a parent columnList.`,
        );
      }
      if (columnList?.blockNoteType !== "columnList") {
        throw new Error(
          `Invalid block: ${columnList.blockNoteType} was found as a parent of column.`,
        );
      }

      if ($pos.node().childCount === 1) {
        tr.replaceWith(
          columnList.bnBlock.beforePos,
          columnList.bnBlock.afterPos,
          Fragment.empty,
        );
      }

      tr.replaceWith(
        columnList.bnBlock.beforePos,
        columnList.bnBlock.afterPos,
        $pos.index() === 0
          ? columnList.bnBlock.node.lastChild!.content
          : columnList.bnBlock.node.firstChild!.content,
      );
    } else if (
      node.type.name === "column" &&
      node.attrs.id !== $pos.nodeAfter?.attrs.id
    ) {
      // This is a hacky work around to handle an edge case with the previous
      // `if else` block. When each `column` of a `columnList` is in the
      // `blocksToRemove` array, this is what happens once all but the last 2
      // columns are removed:
      //
      // 1. The second-to-last `column` is removed.
      // 2. The last `column` and wrapping `columnList` are collapsed.
      // 3. `removedSize` increases by the size of the removed column, and more
      // due to positions at the starts/ends of the last `column` and wrapping
      // `columnList` also getting removed.
      // 3. `tr.doc.descendants` traverses to the last `column`.
      // 4. `removedSize` now includes positions that were removed after the
      // last `column`. In order for `pos - removedSize` to correctly point to
      // the start of the nodes that were previously wrapped by the last
      // `column`, `removedPos` must only include positions removed before it.
      // 5. The deletion is offset by 3, because of those removed positions
      // included in `removedSize` that occur after the last `column`.
      //
      // Hence why we have to shift the start of the deletion range back by 3.
      // The offset for the end of the range is smaller as `node.nodeSize` is
      // the size of the whole second `column`, whereas now we are left with
      // just its children since it's collapsed - a difference of 2 positions.
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
