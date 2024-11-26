import { NodeSelection, Selection, TextSelection } from "prosemirror-state";
import { CellSelection } from "prosemirror-tables";

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
// and restore the selection within a block, when the block is moved.
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
  editor.insertBlocks(blocks, referenceBlock, placement);

  updateBlockSelectionFromData(editor, selectionData);
}

export function moveBlocksUp(editor: BlockNoteEditor<any, any, any>) {
  const selection = editor.getSelection();
  const block = selection?.blocks[0] || editor.getTextCursorPosition().block;
  const prevBlock = editor.getPrevBlock(block);
  const parentBlock = editor.getParentBlock(block);

  let referenceBlockId: string | undefined;
  let placement: "before" | "after" | undefined;

  if (!prevBlock) {
    if (parentBlock) {
      referenceBlockId = parentBlock.id;
      placement = "before";
    }
  } else if (prevBlock.children.length > 0) {
    referenceBlockId = prevBlock.children[prevBlock.children.length - 1].id;
    placement = "after";
  } else {
    referenceBlockId = prevBlock.id;
    placement = "before";
  }

  if (!referenceBlockId || !placement) {
    return;
  }

  moveSelectedBlocksAndSelection(editor, referenceBlockId, placement);
}

export function moveBlocksDown(editor: BlockNoteEditor<any, any, any>) {
  const selection = editor.getSelection();
  const block =
    selection?.blocks[selection?.blocks.length - 1] ||
    editor.getTextCursorPosition().block;
  const nextBlock = editor.getNextBlock(block);
  const parentBlock = editor.getParentBlock(block);

  let referenceBlockId: string | undefined;
  let placement: "before" | "after" | undefined;

  if (!nextBlock) {
    if (parentBlock) {
      referenceBlockId = parentBlock.id;
      placement = "after";
    }
  } else if (nextBlock.children.length > 0) {
    referenceBlockId = nextBlock.children[0].id;
    placement = "before";
  } else {
    referenceBlockId = nextBlock.id;
    placement = "after";
  }

  if (!referenceBlockId || !placement) {
    return;
  }

  moveSelectedBlocksAndSelection(editor, referenceBlockId, placement);
}
