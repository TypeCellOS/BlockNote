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
import { fixContainersById } from "../../containers/fixContainer.js";
import { getAncestorContainers } from "../../containers/containerNav.js";

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
  // Ancestor containers of removed blocks, to repair afterwards. Tracked by
  // node id (not position) since the removals and earlier repairs shift
  // positions; recorded with their depth so repairs run deepest-first.
  const containersToFix: { id: string; depth: number }[] = [];

  const idOfFirstBlock =
    typeof blocksToRemove[0] === "string"
      ? blocksToRemove[0]
      : blocksToRemove[0].id;

  // The walk below reads the document as it is now, but mutates it as it
  // goes, so its positions go stale. `tr.mapping` already tracks exactly
  // that; sliced from here so it ignores steps the caller added earlier.
  const stepsBefore = tr.steps.length;
  const mapPos = (pos: number) => tr.mapping.slice(stepsBefore).map(pos);

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
      tr.insert(mapPos(pos), nodesToInsert);
    }

    const $pos = tr.doc.resolve(mapPos(pos));

    for (const container of getAncestorContainers($pos.doc, $pos.pos)) {
      if (!containersToFix.some((c) => c.id === container.id)) {
        containersToFix.push(container);
      }
    }

    // When the block is the only child of a nested `blockGroup`, delete the
    // group with it (`blockGroup` acting as a `min: 1, whenEmptied: "unwrap"`
    // container). This can't route through `fixContainer`: repair runs after
    // the delete, and by then ProseMirror's replace-fitting has padded the
    // `blockGroupChild+` group with a fresh empty `blockContainer`
    // indistinguishable from an intentional one. Only here, before the
    // delete, is "this was the group's last child" still knowable.
    const parent = $pos.node();
    if (
      parent.type.name === "blockGroup" &&
      $pos.node($pos.depth - 1).type.name !== "doc" &&
      parent.childCount === 1
    ) {
      tr.delete($pos.before(), $pos.after());
    } else {
      tr.delete($pos.pos, $pos.pos + node.nodeSize);
    }

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

  // Repairs the containers the removed blocks lived in (e.g. collapses
  // emptied columns/columnLists), deepest-first. Callers where the removal
  // isn't a deletion can opt out, e.g. `moveBlocks` re-inserts the blocks
  // elsewhere and deliberately leaves emptied containers as-is.
  if (options.fixContainers !== false) {
    fixContainersById(tr, containersToFix);
  }

  // Converts the nodes created from `blocksToInsert` into full `Block`s.
  const insertedBlocks = nodesToInsert.map((node) =>
    nodeToBlock(node, tr.doc),
  ) as Block<BSchema, I, S>[];

  return { insertedBlocks, removedBlocks };
}
