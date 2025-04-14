import { Node, Schema } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import { Block, PartialBlock } from "../../../../blocks/defaultBlocks.js";
import type { BlockCache } from "../../../../editor/BlockNoteEditor";
import { BlockNoteSchema } from "../../../../editor/BlockNoteSchema.js";
import {
  BlockIdentifier,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import { blockToNode } from "../../../nodeConversions/blockToNode.js";
import { nodeToBlock } from "../../../nodeConversions/nodeToBlock.js";

export function removeAndInsertBlocks<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  tr: Transaction,
  schema: Schema,
  blockSchema: BlockNoteSchema<BSchema, I, S>,
  blocksToRemove: BlockIdentifier[],
  blocksToInsert: PartialBlock<BSchema, I, S>[],
  blockCache?: BlockCache
): {
  insertedBlocks: Block<BSchema, I, S>[];
  removedBlocks: Block<BSchema, I, S>[];
} {
  // Converts the `PartialBlock`s to ProseMirror nodes to insert them into the
  // document.
  const nodesToInsert: Node[] = [];
  for (const block of blocksToInsert) {
    nodesToInsert.push(blockToNode(block, schema, blockSchema.styleSchema));
  }

  const idsOfBlocksToRemove = new Set<string>(
    blocksToRemove.map((block) =>
      typeof block === "string" ? block : block.id
    )
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
    removedBlocks.push(
      nodeToBlock(
        node,
        blockSchema.blockSchema,
        blockSchema.inlineContentSchema,
        blockSchema.styleSchema,
        blockCache
      )
    );
    idsOfBlocksToRemove.delete(node.attrs.id);

    if (blocksToInsert.length > 0 && node.attrs.id === idOfFirstBlock) {
      const oldDocSize = tr.doc.nodeSize;
      tr.insert(pos, nodesToInsert);
      const newDocSize = tr.doc.nodeSize;

      removedSize += oldDocSize - newDocSize;
    }

    const oldDocSize = tr.doc.nodeSize;
    // Checks if the block is the only child of its parent. In this case, we
    // need to delete the parent `blockGroup` node instead of just the
    // `blockContainer`.
    const $pos = tr.doc.resolve(pos - removedSize);
    if (
      $pos.node().type.name === "blockGroup" &&
      $pos.node($pos.depth - 1).type.name !== "doc" &&
      $pos.node().childCount === 1
    ) {
      tr.delete($pos.before(), $pos.after());
    } else {
      tr.delete(pos - removedSize, pos - removedSize + node.nodeSize);
    }
    const newDocSize = tr.doc.nodeSize;
    removedSize += oldDocSize - newDocSize;

    return false;
  });

  // Throws an error if now all blocks could be found.
  if (idsOfBlocksToRemove.size > 0) {
    const notFoundIds = [...idsOfBlocksToRemove].join("\n");

    throw Error(
      "Blocks with the following IDs could not be found in the editor: " +
        notFoundIds
    );
  }

  // Converts the nodes created from `blocksToInsert` into full `Block`s.
  const insertedBlocks: Block<BSchema, I, S>[] = [];
  for (const node of nodesToInsert) {
    insertedBlocks.push(
      nodeToBlock(
        node,
        blockSchema.blockSchema,
        blockSchema.inlineContentSchema,
        blockSchema.styleSchema,
        blockCache
      )
    );
  }

  return { insertedBlocks, removedBlocks };
}
