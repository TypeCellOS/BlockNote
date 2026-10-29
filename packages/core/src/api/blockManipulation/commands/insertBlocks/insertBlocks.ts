import { Fragment, Slice } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import { ReplaceStep } from "prosemirror-transform";
import { Block, PartialBlock } from "../../../../blocks/defaultBlocks.js";
import {
  BlockIdentifier,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import {
  type BlockPlacement,
  getInsertionPos,
  getBlockInfoAt,
} from "../../../getBlockInfoFromPos.js";
import { blockToNode } from "../../../nodeConversions/blockToNode.js";
import { nodeToBlock } from "../../../nodeConversions/nodeToBlock.js";
import { getNodeById } from "../../../nodeUtil.js";
import { getPmSchema } from "../../../pmUtil.js";

export function insertBlocks<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  tr: Transaction,
  blocksToInsert: PartialBlock<BSchema, I, S>[],
  referenceBlock: BlockIdentifier,
  placement: BlockPlacement = "before",
): Block<BSchema, I, S>[] {
  const id =
    typeof referenceBlock === "string" ? referenceBlock : referenceBlock.id;
  const pmSchema = getPmSchema(tr);
  const nodesToInsert = blocksToInsert.map((block) => {
    const node = blockToNode(block, pmSchema);
    node.check(); // `blockToNode` is lenient; validate before mutating the doc
    return node;
  });

  const posInfo = getNodeById(id, tr.doc);
  if (!posInfo) {
    throw new Error(`Block with ID ${id} not found`);
  }

  if (nodesToInsert.length === 0) {
    return [];
  }

  const target = getInsertionPos(
    tr.doc,
    getBlockInfoAt(tr.doc, posInfo.posBeforeNode),
    placement,
    nodesToInsert[0].type,
  );
  if (!target) {
    throw new Error(
      `Cannot insert blocks at "${placement}" of block "${id}": no valid position for them`,
    );
  }

  // `getInsertionPos` can only answer for the first node's type: the fragment
  // doesn't exist yet when it runs. The whole fragment still has to fit — a
  // `blockGroup` takes a paragraph but not a `namedOnly` block — so it is
  // checked here, where the nodes are known, rather than left to `tr.step` to
  // reject with a ProseMirror-level message.
  if (
    target.wrapIn &&
    !target.wrapIn.validContent(Fragment.from(nodesToInsert))
  ) {
    throw new Error(
      `Cannot insert blocks at "${placement}" of block "${id}": a "${target.wrapIn.name}" doesn't accept them`,
    );
  }

  const fragment = target.wrapIn
    ? Fragment.from(target.wrapIn.create(null, nodesToInsert))
    : Fragment.from(nodesToInsert);

  const $target = tr.doc.resolve(target.pos);
  if (!$target.parent.canReplace($target.index(), $target.index(), fragment)) {
    throw new Error(
      `Cannot insert blocks at "${placement}" of block "${id}": a "${$target.parent.type.name}" doesn't accept them`,
    );
  }

  tr.step(new ReplaceStep(target.pos, target.pos, new Slice(fragment, 0, 0)));

  // Now that the `PartialBlock`s have been converted to nodes, we can
  // re-convert them into full `Block`s.
  const insertedBlocks = nodesToInsert.map((node) =>
    nodeToBlock(node, tr.doc),
  ) as Block<BSchema, I, S>[];

  return insertedBlocks;
}
