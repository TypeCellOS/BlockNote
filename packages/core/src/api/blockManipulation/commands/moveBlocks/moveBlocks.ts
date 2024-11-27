import { NodeSelection, Selection, TextSelection } from "prosemirror-state";
import { CellSelection } from "prosemirror-tables";

import { Block } from "../../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor";
import { BlockIdentifier } from "../../../../schema/index.js";
import { getNearestBlockPos } from "../../../getBlockInfoFromPos.js";
import { getNodeById } from "../../../nodeUtil.js";

type BlockSelectionData = (
  | {
      type: "text";
      headBlockId: string;
      anchorOffset: number;
      headOffset: number;
    }
  | {
      type: "node";
    }
  | {
      type: "cell";
      anchorCellOffset: number;
      headCellOffset: number;
    }
) & {
  anchorBlockId: string;
};

// `getBlockSelectionData` and `updateBlockSelectionFromData` are used to save
// and restore the selection within a block, when the block is moved. This is
// done by first saving the offsets of the anchor and head from the before
// positions of their surrounding blocks, as well as the IDs of those blocks. We
// can then recreate the selection by finding the blocks with those IDs, getting
// their before positions, and adding the offsets to those positions.
function getBlockSelectionData(
  editor: BlockNoteEditor<any, any, any>
): BlockSelectionData {
  const state = editor._tiptapEditor.state;
  const selection = state.selection;

  const anchorBlockPosInfo = getNearestBlockPos(state.doc, selection.anchor);

  if (selection instanceof CellSelection) {
    return {
      type: "cell" as const,
      anchorBlockId: anchorBlockPosInfo.node.attrs.id,
      anchorCellOffset:
        selection.$anchorCell.pos - anchorBlockPosInfo.posBeforeNode,
      headCellOffset:
        selection.$headCell.pos - anchorBlockPosInfo.posBeforeNode,
    };
  } else if (editor._tiptapEditor.state.selection instanceof NodeSelection) {
    return {
      type: "node" as const,
      anchorBlockId: anchorBlockPosInfo.node.attrs.id,
    };
  } else {
    const headBlockPosInfo = getNearestBlockPos(state.doc, selection.head);

    return {
      type: "text" as const,
      anchorBlockId: anchorBlockPosInfo.node.attrs.id,
      headBlockId: headBlockPosInfo.node.attrs.id,
      anchorOffset: selection.anchor - anchorBlockPosInfo.posBeforeNode,
      headOffset: selection.head - headBlockPosInfo.posBeforeNode,
    };
  }
}

// `getBlockSelectionData` and `updateBlockSelectionFromData` are used to save
// and restore the selection within a block, when the block is moved. This is
// done by first saving the offsets of the anchor and head from the before
// positions of their surrounding blocks, as well as the IDs of those blocks. We
// can then recreate the selection by finding the blocks with those IDs, getting
// their before positions, and adding the offsets to those positions.
function updateBlockSelectionFromData(
  editor: BlockNoteEditor<any, any, any>,
  data: BlockSelectionData
) {
  const anchorBlockPos = getNodeById(
    data.anchorBlockId,
    editor._tiptapEditor.state.doc
  ).posBeforeNode;

  let selection: Selection;
  if (data.type === "cell") {
    selection = CellSelection.create(
      editor._tiptapEditor.state.doc,
      anchorBlockPos + data.anchorCellOffset,
      anchorBlockPos + data.headCellOffset
    );
  } else if (data.type === "node") {
    selection = NodeSelection.create(
      editor._tiptapEditor.state.doc,
      anchorBlockPos + 1
    );
  } else {
    const headBlockPos = getNodeById(
      data.headBlockId,
      editor._tiptapEditor.state.doc
    ).posBeforeNode;

    selection = TextSelection.create(
      editor._tiptapEditor.state.doc,
      anchorBlockPos + data.anchorOffset,
      headBlockPos + data.headOffset
    );
  }

  editor._tiptapEditor.view.dispatch(
    editor._tiptapEditor.state.tr.setSelection(selection)
  );
}

// Replaces any `columnList` blocks with the children of their columns. This is
// done here instead of in `getSelection` as we still need to remove the entire
// `columnList` node but only insert the `blockContainer` nodes inside it.
function flattenColumns(
  blocks: Block<any, any, any>[]
): Block<any, any, any>[] {
  return blocks
    .map((block) => {
      if (block.type === "columnList") {
        return block.children
          .map((column) => flattenColumns(column.children))
          .flat();
      }

      return {
        ...block,
        children: flattenColumns(block.children),
      };
    })
    .flat();
}

// Removes the selected blocks from the editor, then inserts them before/after a
// reference block. Also updates the selection to match the original selection
// using `getBlockSelectionData` and `updateBlockSelectionFromData`.
export function moveSelectedBlocksAndSelection(
  editor: BlockNoteEditor<any, any, any>,
  referenceBlock: BlockIdentifier,
  placement: "before" | "after"
) {
  const blocks = editor.getSelection()?.blocks || [
    editor.getTextCursorPosition().block,
  ];
  const selectionData = getBlockSelectionData(editor);

  editor.removeBlocks(blocks);
  editor.insertBlocks(flattenColumns(blocks), referenceBlock, placement);

  updateBlockSelectionFromData(editor, selectionData);
}

// Checks if a block is in a valid place after being moved. This check is
// primitive at the moment and only returns false if the block's parent is a
// `columnList` block. This is because when moving blocks, columns are flattened
// into regular blocks and therefore can only be nested inside `column` or
// other regular blocks.
function checkPlacementIsValid(parentBlock?: Block<any, any, any>): boolean {
  return !parentBlock || parentBlock.type !== "columnList";
}

// Gets the placement for moving a block up. This has 3 cases:
// 1. If the block has a previous sibling without children, the placement is
// before it.
// 2. If the block has a previous sibling with children, the placement is after
// the last child.
// 3. If the block has no previous sibling, but is nested, the placement is
// before its parent.
// If the placement is invalid, the function is called recursively until a valid
// placement is found. Returns undefined if no valid placement is found or if
// the block is already at the top of the document.
function getMoveUpPlacement(
  editor: BlockNoteEditor<any, any, any>,
  prevBlock?: Block<any, any, any>,
  parentBlock?: Block<any, any, any>
):
  | { referenceBlock: BlockIdentifier; placement: "before" | "after" }
  | undefined {
  let referenceBlock: Block<any, any, any> | undefined;
  let placement: "before" | "after" | undefined;

  if (!prevBlock) {
    if (parentBlock) {
      referenceBlock = parentBlock;
      placement = "before";
    }
  } else if (prevBlock.children.length > 0) {
    referenceBlock = prevBlock.children[prevBlock.children.length - 1];
    placement = "after";
  } else {
    referenceBlock = prevBlock;
    placement = "before";
  }

  if (!referenceBlock || !placement) {
    return undefined;
  }

  const referenceBlockParent = editor.getParentBlock(referenceBlock);
  if (!checkPlacementIsValid(referenceBlockParent)) {
    return getMoveUpPlacement(
      editor,
      placement === "after"
        ? referenceBlock
        : editor.getPrevBlock(referenceBlock),
      referenceBlockParent
    );
  }

  return { referenceBlock, placement };
}

// Gets the placement for moving a block down. This has 3 cases:
// 1. If the block has a next sibling without children, the placement is  after
// it.
// 2. If the block has a next sibling with children, the placement is before the
// first child.
// 3. If the block has no next sibling, but is nested, the placement is
// after its parent.
// If the placement is invalid, the function is called recursively until a valid
// placement is found. Returns undefined if no valid placement is found or if
// the block is already at the bottom of the document.
function getMoveDownPlacement(
  editor: BlockNoteEditor<any, any, any>,
  nextBlock?: Block<any, any, any>,
  parentBlock?: Block<any, any, any>
):
  | { referenceBlock: BlockIdentifier; placement: "before" | "after" }
  | undefined {
  let referenceBlock: Block<any, any, any> | undefined;
  let placement: "before" | "after" | undefined;

  if (!nextBlock) {
    if (parentBlock) {
      referenceBlock = parentBlock;
      placement = "after";
    }
  } else if (nextBlock.children.length > 0) {
    referenceBlock = nextBlock.children[0];
    placement = "before";
  } else {
    referenceBlock = nextBlock;
    placement = "after";
  }

  if (!referenceBlock || !placement) {
    return undefined;
  }

  const referenceBlockParent = editor.getParentBlock(referenceBlock);
  if (!checkPlacementIsValid(referenceBlockParent)) {
    return getMoveDownPlacement(
      editor,
      placement === "before"
        ? referenceBlock
        : editor.getNextBlock(referenceBlock),
      referenceBlockParent
    );
  }

  return { referenceBlock, placement };
}

export function moveBlocksUp(editor: BlockNoteEditor<any, any, any>) {
  const selection = editor.getSelection();
  const block = selection?.blocks[0] || editor.getTextCursorPosition().block;

  const moveUpPlacement = getMoveUpPlacement(
    editor,
    editor.getPrevBlock(block),
    editor.getParentBlock(block)
  );

  if (!moveUpPlacement) {
    return;
  }

  moveSelectedBlocksAndSelection(
    editor,
    moveUpPlacement.referenceBlock,
    moveUpPlacement.placement
  );
}

export function moveBlocksDown(editor: BlockNoteEditor<any, any, any>) {
  const selection = editor.getSelection();
  const block =
    selection?.blocks[selection?.blocks.length - 1] ||
    editor.getTextCursorPosition().block;

  const moveDownPlacement = getMoveDownPlacement(
    editor,
    editor.getNextBlock(block),
    editor.getParentBlock(block)
  );

  if (!moveDownPlacement) {
    return;
  }

  moveSelectedBlocksAndSelection(
    editor,
    moveDownPlacement.referenceBlock,
    moveDownPlacement.placement
  );
}