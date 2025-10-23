import { type Node } from "prosemirror-model";
import { type Transaction } from "prosemirror-state";
import type { Block, PartialBlock } from "../../../../blocks/defaultBlocks.js";
import type {
  BlockIdentifier,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import { blockToNode } from "../../../nodeConversions/blockToNode.js";
import { nodeToBlock } from "../../../nodeConversions/nodeToBlock.js";
import { getPmSchema } from "../../../pmUtil.js";
import { fixColumnList } from "./util/fixColumnList.js";

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
