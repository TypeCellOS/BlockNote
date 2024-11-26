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
>(
  editor: BlockNoteEditor<BSchema, I, S>
): Selection<BSchema, I, S> | undefined {
  const state = editor._tiptapEditor.state;

  const $startBlockBeforePos = state.doc.resolve(
    getNearestBlockPos(state.doc, state.selection.from).posBeforeNode
  );
  const $endBlockBeforePos = state.doc.resolve(
    getNearestBlockPos(state.doc, state.selection.to).posBeforeNode
  );

  // Return undefined if anchor and head are in the same block.
  if ($startBlockBeforePos.pos === $endBlockBeforePos.pos) {
    return undefined;
  }

  // Converts the node at the given index and depth around `$startBlockBeforePos`
  // to a block. Used to get blocks at given indices at the shared depth and
  // at the depth of `$startBlockBeforePos`.
  const indexToBlock = (
    index: number,
    depth?: number
  ): Block<BSchema, I, S> => {
    const pos = $startBlockBeforePos.posAtIndex(index, depth);
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
  // Minimum depth at which the blocks share a common ancestor.
  const sharedDepth = $startBlockBeforePos.sharedDepth($endBlockBeforePos.pos);
  const startIndex = $startBlockBeforePos.index(sharedDepth);
  const endIndex = $endBlockBeforePos.index(sharedDepth);

  // In most cases, we want to return the blocks spanned by the selection at the
  // shared depth. However, when the block in which the selection starts is at a
  // higher depth than the shared depth, we omit the first block at the shared
  // depth. Instead, we include nested blocks of the first block at the shared
  // depth, from the start block onwards and up to its depth. This sounds a bit
  // confusing, but basically it's to mimic Notion's behaviour (which you can
  // see when moving multiple selected blocks up/down using
  // Cmd+Shift+ArrowUp/ArrowDown).
  if ($startBlockBeforePos.depth > sharedDepth) {
    // Adds the block that the selection starts in.
    blocks.push(
      nodeToBlock(
        $startBlockBeforePos.nodeAfter!,
        editor.schema.blockSchema,
        editor.schema.inlineContentSchema,
        editor.schema.styleSchema,
        editor.blockCache
      )
    );

    // Traverses all depths from the depth of the block in which the selection
    // starts, up to the shared depth.
    for (let depth = $startBlockBeforePos.depth; depth > sharedDepth; depth--) {
      const parentNode = $startBlockBeforePos.node(depth);

      if (parentNode.type.isInGroup("childContainer")) {
        const startIndexAtDepth = $startBlockBeforePos.index(depth) + 1;
        const childCountAtDepth = $startBlockBeforePos.node(depth).childCount;

        // Adds all blocks after the index of the block in which the selection
        // starts (or its ancestors at lower depths).
        for (let i = startIndexAtDepth; i < childCountAtDepth; i++) {
          blocks.push(indexToBlock(i, depth));
        }
      }
    }
  } else {
    // Adds the first block spanned by the selection at the shared depth.
    blocks.push(indexToBlock(startIndex, sharedDepth));
  }

  // Adds all blocks spanned by the selection at the shared depth, excluding
  // the first.
  for (let i = startIndex + 1; i <= endIndex; i++) {
    blocks.push(indexToBlock(i, sharedDepth));
  }

  if (blocks.length === 0) {
    throw new Error(
      `Error getting selection - selection doesn't span any blocks (${state.selection})`
    );
  }

  return {
    blocks,
  };
}
