import { Fragment, Node, Schema, Slice } from "prosemirror-model";

import { Block, PartialBlock } from "../../../../blocks/defaultBlocks.js";
import type { BlockCache } from "../../../../editor/BlockNoteEditor";
import {
  BlockIdentifier,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import { blockToNode } from "../../../nodeConversions/blockToNode.js";
import { nodeToBlock } from "../../../nodeConversions/nodeToBlock.js";
import { getNodeById } from "../../../nodeUtil.js";
import { ReplaceStep } from "prosemirror-transform";
import type { Transaction } from "prosemirror-state";
import type { BlockNoteSchema } from "../../../../editor/BlockNoteSchema.js";

export function insertBlocks<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  tr: Transaction,
  pmSchema: Schema,
  schema: BlockNoteSchema<BSchema, I, S>,
  blocksToInsert: PartialBlock<BSchema, I, S>[],
  referenceBlock: BlockIdentifier,
  placement: "before" | "after" = "before",
  blockCache?: BlockCache
): Block<BSchema, I, S>[] {
  const id =
    typeof referenceBlock === "string" ? referenceBlock : referenceBlock.id;

  const nodesToInsert: Node[] = [];
  for (const blockSpec of blocksToInsert) {
    nodesToInsert.push(blockToNode(blockSpec, pmSchema, schema.styleSchema));
  }

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
  const insertedBlocks: Block<BSchema, I, S>[] = [];
  for (const node of nodesToInsert) {
    insertedBlocks.push(
      nodeToBlock(
        node,
        schema.blockSchema,
        schema.inlineContentSchema,
        schema.styleSchema,
        blockCache
      )
    );
  }

  return insertedBlocks;
}
