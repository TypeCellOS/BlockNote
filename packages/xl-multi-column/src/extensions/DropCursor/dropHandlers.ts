import type { Block, BlockNoteEditor } from "@blocknote/core";
import {
  getNodeById,
  removeAndInsertBlocks,
  updateBlock as updateBlockLowLevel,
} from "@blocknote/core";

import { computeColumnListChildrenAfterDrop } from "./util/computeColumnListChildren.js";

/**
 * Handles dropping a block (or column) onto the left/right edge of an
 * existing column, inserting a new column next to it.
 *
 * The removal of the dragged item and the update of `columnList`'s children
 * happen in a single transaction, with column/columnList collapsing
 * ("fixColumns") disabled for the removal step. `newChildren` is computed
 * up-front and already accounts for any column left empty by the removal, so
 * letting `fixColumnList` also run on the removal step would collapse (and
 * invalidate the id of) the very `columnList` we're about to update.
 */
export function dropOntoColumn(
  editor: BlockNoteEditor<any, any, any>,
  params: {
    columnList: Block<any, any, any>;
    targetColumnId: string;
    draggedBlock: Block<any, any, any>;
    position: "left" | "right";
  },
) {
  const { columnList, targetColumnId, draggedBlock, position } = params;

  if (targetColumnId === draggedBlock.id) {
    return;
  }

  const newChildren = computeColumnListChildrenAfterDrop(
    columnList,
    draggedBlock,
    targetColumnId,
    position,
  );

  editor.transact((tr) => {
    if (getNodeById(draggedBlock.id, tr.doc)) {
      removeAndInsertBlocks(tr, [draggedBlock.id], [], { fixColumns: false });
    }

    updateBlockLowLevel(tr, columnList.id, { children: newChildren });
  });
}

/**
 * Handles dropping a block onto the left/right edge of a block that isn't
 * inside a column, wrapping both blocks in a new `columnList`.
 */
export function dropOntoBlock(
  editor: BlockNoteEditor<any, any, any>,
  params: {
    targetBlock: Block<any, any, any>;
    draggedBlock: Block<any, any, any>;
    position: "left" | "right";
  },
) {
  const { targetBlock, draggedBlock, position } = params;

  if (targetBlock.id === draggedBlock.id) {
    return;
  }

  const blocks =
    position === "left"
      ? [draggedBlock, targetBlock]
      : [targetBlock, draggedBlock];

  editor.transact((tr) => {
    if (getNodeById(draggedBlock.id, tr.doc)) {
      removeAndInsertBlocks(tr, [draggedBlock.id], []);
    }

    removeAndInsertBlocks<any, any, any>(
      tr,
      [targetBlock.id],
      [
        {
          type: "columnList",
          children: blocks.map((block) => ({
            type: "column" as const,
            children: [block],
          })),
        },
      ],
    );
  });
}
