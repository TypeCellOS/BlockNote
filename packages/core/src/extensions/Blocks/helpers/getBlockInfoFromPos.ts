import { Node, NodeType } from "prosemirror-model";

export type BlockInfo = {
  id: string;
  node: Node;
  contentNode: Node;
  contentType: NodeType;
  numChildBlocks: number;
  startPos: number;
  endPos: number;
  depth: number;
};

/**
 * Retrieves information regarding the most nested block node in a ProseMirror doc, that a given position lies in.
 * @param doc The ProseMirror doc.
 * @param posInBlock A position somewhere within a block node.
 * @returns A BlockInfo object for the block the given position is in, or undefined if the position is not in a block
 * for the given doc.
 */
export function getBlockInfoFromPos(
  doc: Node,
  posInBlock: number
): BlockInfo | undefined {
  const maxDepth = doc.resolve(posInBlock).depth;
  let node = doc.resolve(posInBlock).node(maxDepth);
  let depth = maxDepth;

  while (depth >= 0) {
    // If the outermost node is not a block, it means the position does not lie within a block.
    if (depth === 0) return undefined;
    if (node.type.name === "block") break;

    depth -= 1;
    node = doc.resolve(posInBlock).node(depth);
  }

  const id = node.attrs["id"];
  const contentNode = node.firstChild!;
  const contentType = contentNode.type;
  const numChildBlocks = node.childCount === 2 ? node.lastChild!.childCount : 0;

  const startPos = doc.resolve(posInBlock).start(depth);
  const endPos = doc.resolve(posInBlock).end(depth);

  return {
    id,
    node,
    contentNode,
    contentType,
    numChildBlocks,
    startPos,
    endPos,
    depth,
  };
}
