import type { Node } from "prosemirror-model";
import { getNodeId } from "./getBlockInfoFromPos.js";

/**
 * Get a TipTap node by id
 */
export function getNodeById(
  id: string,
  doc: Node,
): { node: Node; posBeforeNode: number } | undefined {
  let targetNode: Node | undefined = undefined;
  let posBeforeNode: number | undefined = undefined;

  doc.firstChild!.descendants((node, pos) => {
    // Skips traversing nodes after node with target ID has been found.
    if (targetNode) {
      return false;
    }

    // Keeps traversing nodes if block with target ID has not been found. Some
    // bnBlock nodes we merely pass over (e.g. `column`/`columnList`) may not
    // carry an id — skip them without calling the throwing `getNodeId`, which
    // errors on id-less nodes. Only nodes that actually have an id are compared.
    if (!isNodeBlock(node) || !node.attrs.id || getNodeId(node, doc) !== id) {
      return true;
    }

    targetNode = node;
    posBeforeNode = pos + 1;

    return false;
  });

  if (targetNode === undefined || posBeforeNode === undefined) {
    return undefined;
  }

  return {
    node: targetNode,
    posBeforeNode: posBeforeNode,
  };
}

export function isNodeBlock(node: Node): boolean {
  return node.type.isInGroup("bnBlock");
}
