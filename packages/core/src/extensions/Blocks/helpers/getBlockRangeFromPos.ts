import { getBlockFromPos } from "./getBlockFromPos";
import { EditorState } from "prosemirror-state";

export function getBlockRangeFromPos(state: EditorState, posInBlock: number) {
  const block = getBlockFromPos(state, posInBlock);
  if (block === undefined) return undefined;

  const depth = block.depth;

  const start = state.doc.resolve(posInBlock).start(depth);
  const end = state.doc.resolve(posInBlock).end(depth);

  return { start, end };
}
