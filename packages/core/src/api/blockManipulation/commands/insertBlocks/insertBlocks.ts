import { Fragment, Node, Slice } from "prosemirror-model";

import { Block, PartialBlock } from "../../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor";
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

export function insertBlocks<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  blocksToInsert: PartialBlock<BSchema, I, S>[],
  referenceBlock: BlockIdentifier,
  placement: "before" | "after" = "before"
): Block<BSchema, I, S>[] {
  const id =
    typeof referenceBlock === "string" ? referenceBlock : referenceBlock.id;

  const nodesToInsert: Node[] = [];
  for (const blockSpec of blocksToInsert) {
    nodesToInsert.push(
      blockToNode(blockSpec, editor.pmSchema, editor.schema.styleSchema)
    );
  }

  const tr = editor.transaction;
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

  editor.dispatch(tr);

  // Now that the `PartialBlock`s have been converted to nodes, we can
  // re-convert them into full `Block`s.
  const insertedBlocks: Block<BSchema, I, S>[] = [];
  for (const node of nodesToInsert) {
    insertedBlocks.push(
      nodeToBlock(
        node,
        editor.schema.blockSchema,
        editor.schema.inlineContentSchema,
        editor.schema.styleSchema,
        editor.blockCache
      )
    );
  }

  return insertedBlocks;
}
