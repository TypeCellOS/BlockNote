import { NodeSelection, TextSelection } from "prosemirror-state";
import { CellSelection, TableMap } from "prosemirror-tables";

import { Block } from "../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor";
import { PartialSelection, Selection } from "../../../editor/selectionTypes.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import { UnreachableCaseError } from "../../../util/typescript.js";
import { getBlockInfo, getNearestBlockPos } from "../../getBlockInfoFromPos.js";
import { nodeToBlock } from "../../nodeConversions/nodeToBlock.js";
import { getNodeById } from "../../nodeUtil.js";

export function getSelection<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(editor: BlockNoteEditor<BSchema, I, S>): Selection<BSchema, I, S> {
  const state = editor._tiptapEditor.state;

  const $startBlockBeforePos = state.doc.resolve(
    getNearestBlockPos(state.doc, state.selection.from).posBeforeNode
  );
  const $endBlockBeforePos = state.doc.resolve(
    getNearestBlockPos(state.doc, state.selection.to).posBeforeNode
  );

  const sharedDepth = $startBlockBeforePos.sharedDepth($endBlockBeforePos.pos);

  const startIndex = $startBlockBeforePos.index(sharedDepth);
  const endIndex = $endBlockBeforePos.index(sharedDepth);

  const indexToBlock = (index: number): Block<BSchema, I, S> => {
    const pos = $startBlockBeforePos.posAtIndex(index, sharedDepth);
    const node = state.doc.resolve(pos).nodeAfter;

    if (!node) {
      throw new Error(
        `Error getting selection - node not found at position ${pos}`
      );
    }

    return nodeToBlock(
      node,
      editor.schema.blockSchema,
      editor.schema.inlineContentSchema,
      editor.schema.styleSchema,
      editor.blockCache
    );
  };

  const blocks: Block<BSchema, I, S>[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    blocks.push(indexToBlock(i));
  }

  if (blocks.length === 0) {
    throw new Error(
      `Error getting selection - selection doesn't span any blocks (${state.selection})`
    );
  }

  const prevBlock = startIndex > 0 ? indexToBlock(startIndex - 1) : undefined;
  const nextBlock =
    endIndex < $startBlockBeforePos.node(sharedDepth).childCount - 1
      ? indexToBlock(endIndex + 1)
      : undefined;

  const parentNode = $startBlockBeforePos.node(sharedDepth);
  const parentBlock =
    sharedDepth > 1
      ? nodeToBlock(
          // For blockContainers, the node at the shared depth will be a
          // blockGroup, so we need to go one level deeper to get the actual
          // blockContainer node. For columns & columnLists, we just need to
          // get the node at the shared depth.
          parentNode.type.name === "blockGroup"
            ? $startBlockBeforePos.node(sharedDepth - 1)
            : parentNode,
          editor.schema.blockSchema,
          editor.schema.inlineContentSchema,
          editor.schema.styleSchema,
          editor.blockCache
        )
      : undefined;

  return {
    blocks,
    prevBlock,
    nextBlock,
    parentBlock,
  };
}

function setSelectionAcrossBlocks<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  startBlockId: string,
  endBlockId: string
) {
  const state = editor._tiptapEditor.state;

  const startBlockPosInfo = getNodeById(startBlockId, state.doc);
  const endBlockPosInfo = getNodeById(endBlockId, state.doc);

  if (startBlockPosInfo.posBeforeNode > endBlockPosInfo.posBeforeNode) {
    throw new Error(
      `Error setting selection - start block (id ${startBlockId}) is after end block (id ${endBlockId})`
    );
  }

  const startBlockInfo = getBlockInfo(startBlockPosInfo);
  const endBlockInfo = getBlockInfo(endBlockPosInfo);

  if (startBlockInfo.isBlockContainer && endBlockInfo.isBlockContainer) {
    const startBlockContentType: "none" | "inline" | "table" =
      editor.schema.blockSchema[startBlockInfo.blockNoteType]!.content;
    const endBlockContentType: "none" | "inline" | "table" =
      editor.schema.blockSchema[endBlockInfo.blockNoteType]!.content;

    if (
      startBlockContentType !== "inline" ||
      endBlockContentType !== "inline"
    ) {
      throw new Error(
        `Error setting selection - start block (id ${startBlockId}) or end block (id ${endBlockId}) is not a block with inline content`
      );
    }

    editor.prosemirrorView.dispatch(
      state.tr.setSelection(
        // TODO: We should polish up MultipleNodeSelection so we can use it
        //  instead of TextSelection (i.e. implement `jsonID`, add background
        //  highlight, maybe more). TextSelection is currently the best we have
        //  UX-wise, but it can't handle the case where a selection starts or
        //  ends in a node without content. We
        TextSelection.create(
          state.doc,
          startBlockInfo.blockContent.beforePos + 1,
          endBlockInfo.blockContent.afterPos - 1
        )
      )
    );
  } else {
    const newStartBlockId = startBlockInfo.isBlockContainer
      ? startBlockId
      : startBlockInfo.childContainer.node.firstChild!.attrs.id;
    const newEndBlockId = endBlockInfo.isBlockContainer
      ? endBlockId
      : endBlockInfo.childContainer.node.lastChild!.attrs.id;

    setSelection(editor, {
      startBlock: newStartBlockId,
      endBlock: newEndBlockId,
    });
  }
}

function setSelectionWithinBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  blockId: string,
  selectionType: "span" | "collapsedStart" | "collapsedEnd"
) {
  const state = editor._tiptapEditor.state;

  const posInfo = getNodeById(blockId, state.doc);
  const info = getBlockInfo(posInfo);

  const contentType: "none" | "inline" | "table" =
    editor.schema.blockSchema[info.blockNoteType]!.content;

  let newPMSelection: TextSelection | NodeSelection | CellSelection;

  if (info.isBlockContainer) {
    const blockContent = info.blockContent;

    if (contentType === "inline") {
      if (selectionType === "collapsedStart") {
        newPMSelection = TextSelection.create(
          state.doc,
          blockContent.beforePos + 1
        );
      } else if (selectionType === "collapsedEnd") {
        newPMSelection = TextSelection.create(
          state.doc,
          blockContent.afterPos - 1
        );
      } else {
        newPMSelection = TextSelection.create(
          state.doc,
          blockContent.beforePos + 1,
          blockContent.afterPos - 1
        );
      }
    } else if (contentType === "table") {
      if (selectionType === "collapsedStart") {
        newPMSelection = TextSelection.create(
          state.doc,
          blockContent.beforePos + 4
        );
      } else if (selectionType === "collapsedEnd") {
        newPMSelection = TextSelection.create(
          state.doc,
          blockContent.afterPos - 4
        );
      } else {
        const tableMap = TableMap.get(blockContent.node);

        const firstCellPos = tableMap.positionAt(0, 0, blockContent.node);
        const lastCellPos = tableMap.positionAt(
          tableMap.height - 1,
          tableMap.width - 1,
          blockContent.node
        );

        newPMSelection = CellSelection.create(
          state.doc,
          firstCellPos + blockContent.beforePos + 1,
          lastCellPos + blockContent.beforePos + 1
        );
      }
    } else if (contentType === "none") {
      newPMSelection = NodeSelection.create(state.doc, blockContent.beforePos);
    } else {
      throw new UnreachableCaseError(contentType);
    }

    editor.prosemirrorView.dispatch(state.tr.setSelection(newPMSelection));
  } else {
    if (selectionType === "span") {
      setSelection(editor, {
        startBlock: info.childContainer.node.firstChild!.attrs.id,
        endBlock: info.childContainer.node.lastChild!.attrs.id,
      });
    } else {
      setSelection(editor, {
        block: (selectionType === "collapsedStart"
          ? info.childContainer.node.firstChild!
          : info.childContainer.node.lastChild!
        ).attrs.id,
        selectionType,
      });
    }
  }
}

export function setSelection<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(editor: BlockNoteEditor<BSchema, I, S>, selection: PartialSelection) {
  let firstBlockId: string;
  let lastBlockId: string;
  let selectionType: "span" | "collapsedStart" | "collapsedEnd";

  if (typeof selection === "string") {
    firstBlockId = selection;
    lastBlockId = selection;
    selectionType = "collapsedStart";
  } else if ("id" in selection) {
    firstBlockId = selection.id;
    lastBlockId = selection.id;
    selectionType = "collapsedStart";
  } else if ("block" in selection) {
    if (typeof selection.block === "string") {
      firstBlockId = selection.block;
      lastBlockId = selection.block;
    } else {
      firstBlockId = selection.block.id;
      lastBlockId = selection.block.id;
    }
    selectionType = selection.selectionType;
  } else {
    firstBlockId =
      typeof selection.startBlock === "string"
        ? selection.startBlock
        : selection.startBlock.id;
    lastBlockId =
      typeof selection.endBlock === "string"
        ? selection.endBlock
        : selection.endBlock.id;
    selectionType = "span";
  }

  if (firstBlockId === lastBlockId) {
    setSelectionWithinBlock(editor, firstBlockId, selectionType);
  } else {
    setSelectionAcrossBlocks(editor, firstBlockId, lastBlockId);
  }
}
