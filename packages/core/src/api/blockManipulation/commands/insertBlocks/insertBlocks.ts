import { Fragment, Slice } from "prosemirror-model";

import { Block, PartialBlock } from "../../../../blocks/defaultBlocks.js";
import {
  BlockIdentifier,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import { simpleBlockToNode } from "../../../nodeConversions/blockToNode.js";
import { simpleNodeToBlock } from "../../../nodeConversions/nodeToBlock.js";
import { getNodeById } from "../../../nodeUtil.js";
import { ReplaceStep } from "prosemirror-transform";
import type { Transaction } from "prosemirror-state";
import { getSchemaForTransaction } from "../../../pmUtil.js";

export function insertBlocks<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  tr: Transaction,
  blocksToInsert: PartialBlock<BSchema, I, S>[],
  referenceBlock: BlockIdentifier,
  placement: "before" | "after" = "before"
): Block<BSchema, I, S>[] {
  const id =
    typeof referenceBlock === "string" ? referenceBlock : referenceBlock.id;
  const schema = getSchemaForTransaction(tr);

  const nodesToInsert = blocksToInsert.map((block) =>
    simpleBlockToNode(block, schema)
  );

  const posInfo = getNodeById(id, tr.doc);
  if (!posInfo) {
    throw new Error(`Block with ID ${id} not found`);
  }

  let pos = posInfo.posBeforeNode;
  if (placement === "after") {
    pos += posInfo.node.nodeSize;
  }

  tr.step(
    new ReplaceStep(pos, pos, new Slice(Fragment.from(nodesToInsert), 0, 0))
  );

  // Now that the `PartialBlock`s have been converted to nodes, we can
  // re-convert them into full `Block`s.
  const insertedBlocks = nodesToInsert.map((node) =>
    simpleNodeToBlock(node, schema)
  );

  return insertedBlocks;
}
