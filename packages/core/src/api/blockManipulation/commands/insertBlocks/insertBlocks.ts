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
import {
  BlockInfo,
  getBlockInfoFromNode,
} from "../../../getBlockInfoFromPos.js";
import { blockToNode } from "../../../nodeConversions/blockToNode.js";
import { nodeToBlock } from "../../../nodeConversions/nodeToBlock.js";
import { getNodeById } from "../../../nodeUtil.js";
import { getPmSchema } from "../../../pmUtil.js";

/**
 * Where blocks go relative to a reference block. `"before"`/`"after"` make
 * them siblings of it; `"first-child"`/`"last-child"` nest them inside it.
 *
 * The nested placements also cover blocks that have no children to point at:
 * a regular block's `blockGroup` is lazy (`blockContent blockGroup?`), so a
 * block without children has no child block to insert before or after.
 */
export type BlockPlacement = "before" | "after" | "first-child" | "last-child";

/**
 * Walks one edge of a block's children, descending through nested
 * child-holding wrapper blocks (e.g. a Column inside a ColumnList), to the
 * deepest position where `nodeType` fits. `edge` picks the trailing edge
 * (where a new last child goes) or the leading edge.
 */
function descendToInsertionPos(
  info: BlockInfo,
  nodeType: NodeType,
  edge: "first" | "last",
): { pos: number } | { pos?: undefined; blockedBy: "schema" } {
  const children = info.children;
  if (!children) {
    return { blockedBy: "schema" };
  }

  const last = edge === "last";
  const index = last ? children.node.childCount : 0;
  // `canReplaceWith` rather than a bare content match: the children already
  // after the position have to still fit once the new node is spliced in.
  if (children.node.canReplaceWith(index, index, nodeType)) {
    return { pos: last ? children.childrenEnd : children.childrenStart };
  }

  const child = last ? children.node.lastChild : children.node.firstChild;
  if (
    !child ||
    !(child.type.isInGroup("bnBlock") && child.type.isInGroup("childContainer"))
  ) {
    return { blockedBy: "schema" };
  }
  return descendToInsertionPos(
    getBlockInfoFromNode(
      child,
      last ? children.childrenEnd - child.nodeSize : children.childrenStart,
    ),
    nodeType,
    edge,
  );
}

/**
 * Resolves a `placement` against a reference block into the document position
 * a node of `nodeType` should be inserted at, or `null` when the reference
 * block cannot take it there.
 *
 * Shared by `insertBlocks` and the move commands, so "does this block fit
 * here?" is answered in one place. The answer comes from the schema's content
 * matches rather than from a hand-written rule.
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

    // `canReplaceWith` rather than a bare content match: the nodes already
    // after the position have to still fit once the new one is spliced in.
    return $pos.parent.canReplaceWith($pos.index(), $pos.index(), nodeType)
      ? { pos }
      : null;
  }

  const info = getBlockInfoFromNode(node, posBeforeNode);

  if (info.children) {
    const { pos } = descendToInsertionPos(
      info,
      nodeType,
      placement === "first-child" ? "first" : "last",
    );

    return pos === undefined ? null : { pos };
  }

  // No children holder implies a `blockContainer` with no children yet: its
  // `blockGroup` is lazy (`blockContent blockGroup?`), so the position after
  // the content node only becomes valid once the nodes are wrapped in a new
  // group.
  const blockGroupType = nodeType.schema.nodes["blockGroup"];

  return info.hasContent && blockGroupType?.contentMatch.matchType(nodeType)
    ? { pos: info.content.afterPos, wrapIn: blockGroupType }
    : null;
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
      `Cannot insert blocks at "${placement}" of block "${id}": no valid position for them`,
    );
  }

  // `getInsertionPos` can only answer for the first node's type: the fragment
  // doesn't exist yet when it runs. The whole fragment still has to fit, so it
  // is checked here, where the nodes are known, rather than left to `tr.step`
  // to reject with a ProseMirror-level message.
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
