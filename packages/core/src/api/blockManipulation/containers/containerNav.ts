import type { Node, NodeType } from "prosemirror-model";

import { isContainerNode, isSealed } from "../../../schema/blocks/children.js";
import {
  type BlockInfo,
  getBlockInfoFromNode,
} from "../../getBlockInfoFromPos.js";

/**
 * The outcome of a descent. `blockedBy` says why no position was found: a
 * sealed container on the path ("seal"), or nothing on that edge accepting
 * the type ("schema"). Gesture code tells the two apart to select a sealed
 * container rather than move content into it.
 */
export type InsertionPos =
  | { pos: number; blockedBy?: undefined }
  | { pos?: undefined; blockedBy: "seal" | "schema" };

/**
 * Seal handling for the navigation helpers below. They respect seals, so
 * content never implicitly crosses a sealed boundary. The block manipulation
 * API opts out with `allowCrossingSeals`, since an explicit placement is an
 * intentional crossing.
 */
type SealOpts = { allowCrossingSeals?: boolean };

/**
 * Walks one edge of a block's children, descending through nested containers,
 * to the deepest position where `nodeType` fits. `edge` picks the trailing
 * edge (where a new last child goes) or the leading edge.
 */
export function descendToInsertionPos(
  info: BlockInfo,
  nodeType: NodeType,
  edge: "first" | "last",
  opts?: SealOpts,
): InsertionPos {
  const children = info.children;
  if (!children) {
    return { blockedBy: "schema" };
  }
  if (!opts?.allowCrossingSeals && isSealed(children.node)) {
    return { blockedBy: "seal" };
  }

  const last = edge === "last";
  const index = last ? children.node.childCount : 0;
  // `canReplaceWith` rather than a bare content match: the children already
  // after the position have to still fit once the new node is spliced in.
  if (children.node.canReplaceWith(index, index, nodeType)) {
    return { pos: last ? children.childrenEnd : children.childrenStart };
  }

  const child = last ? children.node.lastChild : children.node.firstChild;
  if (!child || !isContainerNode(child.type)) {
    return { blockedBy: "schema" };
  }
  return descendToInsertionPos(
    getBlockInfoFromNode(
      child,
      last ? children.childrenEnd - child.nodeSize : children.childrenStart,
    ),
    nodeType,
    edge,
    opts,
  );
}

/**
 * Resolves a block to its first leaf block: the block itself when it is not a
 * container, otherwise the first leaf of its first child. Returns `null` for
 * an empty container, or when reaching the leaf would cross a sealed
 * container's boundary.
 */
export function getFirstLeafBlock(info: BlockInfo): BlockInfo | null {
  const children = info.children;
  if (!children || !isContainerNode(info.block.node.type)) {
    // Not a container: the block is its own first leaf.
    return info;
  }
  // A sealed container's leaf blocks are not reachable from outside.
  if (isSealed(info.block.node)) {
    return null;
  }
  const firstChild = children.node.firstChild;
  if (!firstChild) {
    return null;
  }
  return getFirstLeafBlock(
    getBlockInfoFromNode(firstChild, children.childrenStart),
  );
}

/**
 * Climbs out of containers until it reaches a position where `nodeType` fits.
 * `side` picks which edge of each climbed container to land on: `"before"` for
 * moves that put a block above the containers it leaves (Backspace move-out),
 * `"after"` for moves that put it below them (Enter-exit).
 *
 * Position-based rather than `BlockInfo`-based (unlike the descend/leaf
 * helpers above) because its input is an arbitrary gap position — a point
 * between blocks, not a block.
 */
export function ascendToInsertablePos(
  doc: Node,
  pos: number,
  nodeType: NodeType,
  side: "before" | "after" = "before",
): number | undefined {
  for (;;) {
    const $pos = doc.resolve(pos);
    const parent = $pos.node();
    if (parent.canReplaceWith($pos.index(), $pos.index(), nodeType)) {
      return pos;
    }
    if ($pos.depth > 0 && isContainerNode(parent.type)) {
      // Climbing out of a sealed container would move content across its
      // boundary.
      if (isSealed(parent)) {
        return undefined;
      }
      pos = side === "before" ? $pos.before() : $pos.after();
      continue;
    }
    return undefined;
  }
}

/**
 * The container ancestors of a position, outermost last, each with its block
 * id and resolution depth. Used to re-run container repair (`fixContainersById`)
 * on every container a mutation may have emptied. Position-based for the same
 * reason as `ascendToInsertablePos`: selections and mapped positions are the
 * natural inputs.
 */
export function getAncestorContainers(
  doc: Node,
  pos: number,
): { id: string; depth: number }[] {
  const $pos = doc.resolve(pos);
  const containers: { id: string; depth: number }[] = [];
  for (let depth = $pos.depth; depth > 0; depth--) {
    const ancestor = $pos.node(depth);
    if (isContainerNode(ancestor.type) && ancestor.attrs.id) {
      containers.push({ id: ancestor.attrs.id, depth });
    }
  }
  return containers;
}
