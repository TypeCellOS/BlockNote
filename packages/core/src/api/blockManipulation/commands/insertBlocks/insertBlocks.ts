import { Fragment, Node, NodeType, Slice } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import { ReplaceStep } from "prosemirror-transform";
import { Block, PartialBlock } from "../../../../blocks/defaultBlocks.js";
import {
  BlockIdentifier,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import { isContainerBlockNode } from "../../../../schema/blocks/children.js";
import { blockToNode } from "../../../nodeConversions/blockToNode.js";
import { nodeToBlock } from "../../../nodeConversions/nodeToBlock.js";
import { getNodeById } from "../../../nodeUtil.js";
import { getPmSchema } from "../../../pmUtil.js";
import {
  descendToFirstInsertionPos,
  descendToLastInsertionPos,
} from "../../containers/containerNav.js";

/**
 * Where blocks go relative to a reference block. `"before"`/`"after"` make them
 * siblings of it; `"start"`/`"end"` nest them inside it, as its first or last
 * children.
 *
 * The nested placements are what addresses a container that has no children
 * to point at — a `min: 0` container that is currently empty has no child
 * block to insert before or after.
 */
export type BlockPlacement = "before" | "after" | "start" | "end";

/**
 * Resolves a `placement` against a reference block into the document position
 * a node of `nodeType` should be inserted at, or `null` when the reference
 * block cannot take it there.
 *
 * Both insertion and the move commands ask this same question — "does this
 * block fit here?" — so they ask it in one place. The answer comes from the
 * schema's content matches rather than from a hand-written rule, so a
 * container's `children` config is what decides it.
 *
 * `wrapIn` is set when the position only becomes valid once the nodes are
 * wrapped: a regular block with no children yet has no `blockGroup` for them
 * to go in, so one is created around them.
 */
export function getInsertionPos(
  doc: Node,
  reference: { node: Node; posBeforeNode: number },
  placement: BlockPlacement,
  nodeType: NodeType,
): { pos: number; wrapIn?: NodeType } | null {
  const { node, posBeforeNode } = reference;

  if (placement === "before" || placement === "after") {
    const pos =
      placement === "before" ? posBeforeNode : posBeforeNode + node.nodeSize;
    const $pos = doc.resolve(pos);

    return $pos.parent.contentMatchAt($pos.index()).matchType(nodeType)
      ? { pos }
      : null;
  }

  // A container holds its children itself, or — when it has content of its own
  // — in its generated `__children` node, which the descent helpers step into.
  // The descent helpers ignore sealed boundaries by default, which is right
  // here: an explicit `insertBlocks` placement is an intentional crossing.
  if (isContainerBlockNode(node)) {
    const pos =
      placement === "start"
        ? descendToFirstInsertionPos(node, posBeforeNode, nodeType)
        : descendToLastInsertionPos(node, posBeforeNode, nodeType);

    return pos === null ? null : { pos };
  }

  // A regular block keeps its children in a `blockGroup` that only exists once
  // it has some.
  const blockGroupType = nodeType.schema.nodes["blockGroup"];
  if (node.type.name !== "blockContainer" || !blockGroupType) {
    return null;
  }

  const blockGroupPos = posBeforeNode + 1 + node.firstChild!.nodeSize;

  if (node.childCount < 2) {
    return blockGroupType.contentMatch.matchType(nodeType)
      ? { pos: blockGroupPos, wrapIn: blockGroupType }
      : null;
  }

  const pos =
    placement === "start"
      ? descendToFirstInsertionPos(node.lastChild!, blockGroupPos, nodeType)
      : descendToLastInsertionPos(node.lastChild!, blockGroupPos, nodeType);

  return pos === null ? null : { pos };
}

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
    posInfo,
    placement,
    nodesToInsert[0].type,
  );
  if (!target) {
    throw new Error(
      `Cannot insert a block of type "${blocksToInsert[0].type ?? "paragraph"}" ` +
        (placement === "before" || placement === "after"
          ? `${placement} block with ID ${id}: its parent does not accept it.`
          : `at the ${placement} of block with ID ${id}: the block does not accept it as a child.`),
    );
  }

  const fragment = target.wrapIn
    ? Fragment.from(target.wrapIn.create(null, nodesToInsert))
    : Fragment.from(nodesToInsert);

  tr.step(new ReplaceStep(target.pos, target.pos, new Slice(fragment, 0, 0)));

  // Now that the `PartialBlock`s have been converted to nodes, we can
  // re-convert them into full `Block`s.
  const insertedBlocks = nodesToInsert.map((node) =>
    nodeToBlock(node, tr.doc),
  ) as Block<BSchema, I, S>[];

  return insertedBlocks;
}
