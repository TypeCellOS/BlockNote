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
 * Retrieves information regarding the nearest blockContainer node in a
 * ProseMirror doc, relative to a position.
 * @param doc The ProseMirror doc.
 * @param pos An integer position.
 * @returns A BlockInfo object for the nearest blockContainer node.
 */
export function getBlockInfoFromPos(doc: Node, pos: number): BlockInfo {
  // If the position is outside the outer block group, we need to move it to the
  // nearest block. This happens when the collaboration plugin is active, where
  // the selection is placed at the very end of the doc.
  const outerBlockGroupStartPos = 1;
  const outerBlockGroupEndPos = doc.nodeSize - 2;
  if (pos <= outerBlockGroupStartPos) {
    pos = outerBlockGroupStartPos + 1;

    while (
      doc.resolve(pos).parent.type.name !== "blockContainer" &&
      pos < outerBlockGroupEndPos
    ) {
      pos++;
    }
  } else if (pos >= outerBlockGroupEndPos) {
    pos = outerBlockGroupEndPos - 1;

    while (
      doc.resolve(pos).parent.type.name !== "blockContainer" &&
      pos > outerBlockGroupStartPos
    ) {
      pos--;
    }
  }

  // This gets triggered when a node selection on a block is active, i.e. when
  // you drag and drop a block.
  if (doc.resolve(pos).parent.type.name === "blockGroup") {
    pos++;
  }

  const $pos = doc.resolve(pos);

  const maxDepth = $pos.depth;
  let node = $pos.node(maxDepth);
  let depth = maxDepth;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (depth < 0) {
      throw new Error(
        "Could not find blockContainer node. This can only happen if the underlying BlockNote schema has been edited."
      );
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
