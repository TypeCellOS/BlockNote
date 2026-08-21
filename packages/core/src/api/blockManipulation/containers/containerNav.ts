import type { Node, NodeType } from "prosemirror-model";

import {
  isContainerBlockNode,
  isContainerNode,
  isContentContainerNode,
  isSealed,
} from "../../../schema/blocks/children.js";

/**
 * Seal handling for the navigation helpers below. By default the helpers
 * ignore seals — the block manipulation API crosses them freely, since an
 * explicit placement is an intentional crossing. Gesture code (keyboard
 * merges and moves) opts in with `respectSealed`: a sealed boundary means
 * content never *implicitly* crosses it.
 */
type SealOpts = { respectSealed?: boolean };

export function descendToLastInsertionPos(
  container: Node,
  containerBeforePos: number,
  nodeType: NodeType,
  opts?: SealOpts,
): number | null {
  if (opts?.respectSealed && isSealed(container)) {
    return null;
  }
  const endPos = containerBeforePos + 1 + container.content.size;
  if (container.contentMatchAt(container.childCount).matchType(nodeType)) {
    return endPos;
  }
  const lastChild = container.lastChild;
  if (lastChild && isContainerNode(lastChild.type)) {
    return descendToLastInsertionPos(
      lastChild,
      endPos - lastChild.nodeSize,
      nodeType,
      opts,
    );
  }
  return null;
}

// No seal handling: its only callers are API code, which crosses seals by
// construction.
export function descendToFirstInsertionPos(
  container: Node,
  containerBeforePos: number,
  nodeType: NodeType,
): number | null {
  // A content container's children start after the content node.
  if (isContentContainerNode(container)) {
    return descendToFirstInsertionPos(
      container.lastChild!,
      containerBeforePos + 1 + container.firstChild!.nodeSize,
      nodeType,
    );
  }

  const startPos = containerBeforePos + 1;
  if (container.contentMatchAt(0).matchType(nodeType)) {
    return startPos;
  }
  const firstChild = container.firstChild;
  if (firstChild && isContainerNode(firstChild.type)) {
    return descendToFirstInsertionPos(firstChild, startPos, nodeType);
  }
  return null;
}

export function getFirstLeafBlock(
  container: Node,
  containerBeforePos: number,
  opts?: SealOpts,
): { node: Node; beforePos: number } | null {
  // With `respectSealed`, a sealed container's leaf blocks are not reachable
  // from outside.
  if (opts?.respectSealed && isSealed(container)) {
    return null;
  }
  if (isContentContainerNode(container)) {
    return getFirstLeafBlock(
      container.lastChild!,
      containerBeforePos + 1 + container.firstChild!.nodeSize,
      opts,
    );
  }

  const firstChild = container.firstChild;
  if (!firstChild) {
    return null;
  }
  const firstChildBeforePos = containerBeforePos + 1;
  if (isContainerNode(firstChild.type)) {
    return getFirstLeafBlock(firstChild, firstChildBeforePos, opts);
  }
  return { node: firstChild, beforePos: firstChildBeforePos };
}

/**
 * Climbs out of containers until it reaches a position where `nodeType` fits.
 * `side` picks which edge of each climbed container to land on: `"before"` for
 * moves that put a block above the containers it leaves (Backspace move-out),
 * `"after"` for moves that put it below them (Enter-exit).
 */
export function ascendToInsertablePos(
  doc: Node,
  pos: number,
  nodeType: NodeType,
  opts?: SealOpts,
  side: "before" | "after" = "before",
): number | null {
  for (;;) {
    const $pos = doc.resolve(pos);
    const parent = $pos.node();
    if (parent.contentMatchAt($pos.index()).matchType(nodeType)) {
      return pos;
    }
    // A content-bearing container is climbed out of too: the ascent may sit
    // right after its `__children` node, where only that node's siblings fit.
    if ($pos.depth > 0 && isContainerBlockNode(parent)) {
      // With `respectSealed`, climbing out of a sealed container would move
      // content across its boundary.
      if (opts?.respectSealed && isSealed(parent)) {
        return null;
      }
      pos = side === "before" ? $pos.before() : $pos.after();
      continue;
    }
    return null;
  }
}

export function getAncestorContainers(
  doc: Node,
  pos: number,
): { id: string; depth: number }[] {
  const $pos = doc.resolve(pos);
  const containers: { id: string; depth: number }[] = [];
  for (let depth = $pos.depth; depth > 0; depth--) {
    const ancestor = $pos.node(depth);
    if (isContainerBlockNode(ancestor) && ancestor.attrs.id) {
      containers.push({ id: ancestor.attrs.id, depth });
    }
  }
  return containers;
}
