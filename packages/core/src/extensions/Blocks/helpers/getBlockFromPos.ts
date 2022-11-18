import { Node } from "prosemirror-model";

export function getBlockFromPos(doc: Node, posInBlock: number) {
  const maxDepth = doc.resolve(posInBlock).depth;
  let node = doc.resolve(posInBlock).node(maxDepth);
  let depth = maxDepth;

  while (depth >= 0) {
    // Outermost node should never be a block (must have block group parent).
    if (depth === 0) return undefined;
    if (node.type.name === "block") break;

    depth -= 1;
    node = doc.resolve(posInBlock).node(depth);
  }

  return { node, depth };
}
