import { Block } from "../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor";
import { Selection } from "../../../editor/selectionTypes.js";
import {
  BlockIdentifier,
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

  const parentBlock =
    sharedDepth > 1
      ? nodeToBlock(
          $startBlockBeforePos.node(sharedDepth - 1),
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

export function setTextCursorPosition<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  targetBlock: BlockIdentifier,
  placement: "start" | "end" = "start"
) {
  const id = typeof targetBlock === "string" ? targetBlock : targetBlock.id;

  const posInfo = getNodeById(id, editor._tiptapEditor.state.doc);
  const info = getBlockInfo(posInfo);

  const contentType: "none" | "inline" | "table" =
    editor.schema.blockSchema[info.blockNoteType]!.content;

  if (info.isBlockContainer) {
    const blockContent = info.blockContent;
    if (contentType === "none") {
      editor._tiptapEditor.commands.setNodeSelection(blockContent.beforePos);
      return;
    }

    if (contentType === "inline") {
      if (placement === "start") {
        editor._tiptapEditor.commands.setTextSelection(
          blockContent.beforePos + 1
        );
      } else {
        editor._tiptapEditor.commands.setTextSelection(
          blockContent.afterPos - 1
        );
      }
    } else if (contentType === "table") {
      if (placement === "start") {
        // Need to offset the position as we have to get through the `tableRow`
        // and `tableCell` nodes to get to the `tableParagraph` node we want to
        // set the selection in.
        editor._tiptapEditor.commands.setTextSelection(
          blockContent.beforePos + 4
        );
      } else {
        editor._tiptapEditor.commands.setTextSelection(
          blockContent.afterPos - 4
        );
      }
    } else {
      throw new UnreachableCaseError(contentType);
    }
  } else {
    const child =
      placement === "start"
        ? info.childContainer.node.firstChild!
        : info.childContainer.node.lastChild!;

    setTextCursorPosition(editor, child.attrs.id, placement);
  }
}
