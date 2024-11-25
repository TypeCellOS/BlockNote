import { Block } from "../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor";
import { Selection } from "../../../editor/selectionTypes.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import { getNearestBlockPos } from "../../getBlockInfoFromPos.js";
import { nodeToBlock } from "../../nodeConversions/nodeToBlock.js";

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
  // console.log($startBlockBeforePos.node(sharedDepth).type.name);
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
