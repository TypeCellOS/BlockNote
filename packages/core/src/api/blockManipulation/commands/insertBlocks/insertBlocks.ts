import { Fragment, Slice } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import { ReplaceStep } from "prosemirror-transform";
import { Block, PartialBlock } from "../../../../blocks/defaultBlocks.js";
import { resolveLocationToPM } from "../../../../locations/location.js";
import { Location } from "../../../../locations/types.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import { blockToNode } from "../../../nodeConversions/blockToNode.js";
import { nodeToBlock } from "../../../nodeConversions/nodeToBlock.js";
import { getPmSchema } from "../../../pmUtil.js";

export function insertBlocks<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  tr: Transaction,
  blocksToInsert: PartialBlock<BSchema, I, S>[],
  referenceBlock: Location,
  placement: "before" | "after" = "before",
): Block<BSchema, I, S>[] {
  const pmSchema = getPmSchema(tr);
  const nodesToInsert = blocksToInsert.map((block) =>
    blockToNode(block, pmSchema),
  );

  const resolved = resolveLocationToPM(tr.doc, referenceBlock);
  // head + 1 because head points to within the blockContent, not the blockContainer we want to replace
  const pos = placement === "after" ? resolved.head + 1 : resolved.anchor;

  tr.step(
    new ReplaceStep(pos, pos, new Slice(Fragment.from(nodesToInsert), 0, 0)),
  );

  // Now that the `PartialBlock`s have been converted to nodes, we can
  // re-convert them into full `Block`s.
  const insertedBlocks = nodesToInsert.map((node) =>
    nodeToBlock(node, pmSchema),
  ) as Block<BSchema, I, S>[];

  return insertedBlocks;
}
