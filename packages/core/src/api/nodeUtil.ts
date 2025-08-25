import type { Node } from "prosemirror-model";

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

    // Keeps traversing nodes if block with target ID has not been found.
    if (!isNodeBlock(node) || node.attrs.id !== id) {
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
