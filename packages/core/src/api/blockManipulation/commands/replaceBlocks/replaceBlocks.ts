import { type Node } from "prosemirror-model";
import { type Transaction } from "prosemirror-state";
import type { Block, PartialBlock } from "../../../../blocks/defaultBlocks.js";
import { getNodeId } from "../../../getBlockInfoFromPos.js";
import type {
  BlockIdentifier,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import { blockToNode } from "../../../nodeConversions/blockToNode.js";
import { nodeToBlock } from "../../../nodeConversions/nodeToBlock.js";
import { getPmSchema } from "../../../pmUtil.js";
import {
  containerAncestorIds,
  fixContainersById,
} from "../../containers/fixContainer.js";

export function removeAndInsertBlocks<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  tr: Transaction,
  blocksToRemove: BlockIdentifier[],
  blocksToInsert: PartialBlock<BSchema, I, S>[],
  options: {
    fixContainers?: boolean;
  } = {},
): {
  insertedBlocks: Block<BSchema, I, S>[];
  removedBlocks: Block<BSchema, I, S>[];
} {
  const pmSchema = getPmSchema(tr);
  // Converts the `PartialBlock`s to ProseMirror nodes to insert them into the
  // document.
  const nodesToInsert: Node[] = blocksToInsert.map((block) => {
    const node = blockToNode(block, pmSchema);
    node.check(); // `blockToNode` is lenient; validate before mutating the doc
    return node;
  });

  const idsOfBlocksToRemove = new Set<string>(
    blocksToRemove.map((block) =>
      typeof block === "string" ? block : block.id,
    ),
  );
  const removedBlocks: Block<BSchema, I, S>[] = [];
  const containerIds = new Set<string>();

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
    if (!node.type.isInGroup("bnBlock")) {
      return true;
    }

    const nodeId = getNodeId(node, tr.doc);

    if (!idsOfBlocksToRemove.has(nodeId)) {
      return true;
    }

    // Saves the block that is being deleted.
    removedBlocks.push(nodeToBlock(node, tr.doc));
    idsOfBlocksToRemove.delete(nodeId);

    if (blocksToInsert.length > 0 && nodeId === idOfFirstBlock) {
      const oldDocSize = tr.doc.nodeSize;
      tr.insert(pos, nodesToInsert);
      const newDocSize = tr.doc.nodeSize;

      removedSize += oldDocSize - newDocSize;
    }

    const oldDocSize = tr.doc.nodeSize;

    const $pos = tr.doc.resolve(pos - removedSize);

    // Every container the removed block sits in may be left needing repair
    // (an emptied column, a column list down to one column). Collected as ids
    // because the repair runs once every removal is done, by which time these
    // positions have moved.
    for (const id of containerAncestorIds(tr.doc, $pos.pos)) {
      containerIds.add(id);
    }

    if (
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

  // Repairs the containers the removal emptied out. Callers where the removal
  // isn't a deletion can opt out - e.g. `moveBlocks` re-inserts the blocks
  // elsewhere and deliberately leaves emptied containers as-is.
  if (options.fixContainers !== false) {
    fixContainersById(tr, containerIds);
  }

  // Converts the nodes created from `blocksToInsert` into full `Block`s.
  const insertedBlocks = nodesToInsert.map((node) =>
    nodeToBlock(node, tr.doc),
  ) as Block<BSchema, I, S>[];

  return { insertedBlocks, removedBlocks };
}
