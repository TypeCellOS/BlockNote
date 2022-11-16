import { EditorState } from "prosemirror-state";

export function getBlockFromPos(state: EditorState, posInBlock: number) {
  const maxDepth = state.doc.resolve(posInBlock).depth;
  let node = state.doc.resolve(posInBlock).node(maxDepth);
  let depth = maxDepth;

  while (depth >= 0) {
    // Outermost node should never be a block (must have block group parent).
    if (depth === 0) return undefined;
    if (node.type.name === "block") break;

    depth -= 1;
    node = state.doc.resolve(posInBlock).node(depth);
  }

  return { node, depth };
}
