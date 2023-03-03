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
  if (posInBlock < 0 || posInBlock > doc.nodeSize) {
    return undefined;
  }

  const $pos = doc.resolve(posInBlock);

  const maxDepth = $pos.depth;
  let node = $pos.node(maxDepth);
  let depth = maxDepth;

  while (true) {
    if (depth < 0) {
      return undefined;
    }

    if (node.type.name === "blockContainer") {
      break;
    }

    depth -= 1;
    node = $pos.node(depth);
  }

  const id = node.attrs["id"];
  const contentNode = node.firstChild!;
  const contentType = contentNode.type;
  const numChildBlocks = node.childCount === 2 ? node.lastChild!.childCount : 0;

  const startPos = $pos.start(depth);
  const endPos = $pos.end(depth);

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
