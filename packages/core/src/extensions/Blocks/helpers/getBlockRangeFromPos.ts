import { Node } from "prosemirror-model";
import { getBlockFromPos } from "./getBlockFromPos";

export function getBlockRangeFromPos(doc: Node, posInBlock: number) {
  const block = getBlockFromPos(doc, posInBlock);
  if (block === undefined) return undefined;

  const depth = block.depth;

  const start = doc.resolve(posInBlock).start(depth);
  const end = doc.resolve(posInBlock).end(depth);

  return { start, end };
}
