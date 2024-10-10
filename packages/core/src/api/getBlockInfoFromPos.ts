import { Node, NodeType } from "prosemirror-model";

export type BlockInfoWithoutPositions = {
  id: string;
  node: Node;
  contentNode: Node;
  contentType: NodeType;
  numChildBlocks: number;
};

export type BlockInfo = BlockInfoWithoutPositions & {
  startPos: number;
  endPos: number;
  depth: number;
};

/**
 * Helper function for `getBlockInfoFromPos`, returns information regarding
 * provided blockContainer node.
 * @param blockContainer The blockContainer node to retrieve info for.
 */
export function getBlockInfo(blockContainer: Node): BlockInfoWithoutPositions {
  const id = blockContainer.attrs["id"];
  const contentNode = blockContainer.firstChild!;
  const contentType = contentNode.type;
  const numChildBlocks =
    blockContainer.childCount === 2 ? blockContainer.lastChild!.childCount : 0;

  return {
    id,
    node: blockContainer,
    contentNode,
    contentType,
    numChildBlocks,
  };
}

/**
 * Retrieves the position just before the nearest blockContainer node in a
 * ProseMirror doc, relative to a position. If the position is within a
 * blockContainer node or its descendants, the position just before it is
 * returned. If the position is not within a blockContainer node or its
 * descendants, the position just before the next closest blockContainer node
 * is returned. If the position is beyond the last blockContainer, the position
 * just before the last blockContainer is returned.
 * @param doc The ProseMirror doc.
 * @param pos An integer position.
 * @returns The position just before the nearest blockContainer node.
 */
export function getNearestBlockContainerPos(doc: Node, pos: number) {
  const $pos = doc.resolve(pos);

  // Checks the node containing the position and its ancestors until a
  // blockContainer node is found and returned.
  let depth = $pos.depth;
  let node = $pos.node(depth);
  while (depth > 0) {
    if (node.type.name === "blockContainer") {
      return $pos.before(depth);
    }

    depth--;
    node = $pos.node(depth);
  }

  // If the position doesn't lie within a blockContainer node, we instead find
  // the position of the next closest one. If the position is beyond the last
  // blockContainer, we return the position of the last blockContainer. While
  // running `doc.descendants` is expensive, this case should be very rarely
  // triggered as almost every position will be within a blockContainer,
  // according to the schema.
  const allBlockContainerPositions: number[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "blockContainer") {
      allBlockContainerPositions.push(pos);
    }
  });

  return (
    allBlockContainerPositions.find((position) => position >= pos) ||
    allBlockContainerPositions[allBlockContainerPositions.length - 1]
  );
}

/**
 * Retrieves information regarding the nearest blockContainer node in a
 * ProseMirror doc, relative to a position.
 * @param doc The ProseMirror doc.
 * @param pos An integer position.
 * @returns A BlockInfo object for the nearest blockContainer node.
 */
export function getBlockInfoFromPos(doc: Node, pos: number): BlockInfo {
  const $pos = doc.resolve(getNearestBlockContainerPos(doc, pos));
  const node = $pos.nodeAfter!;

  const { id, contentNode, contentType, numChildBlocks } = getBlockInfo(node);

  const posInsideBlockContainer = $pos.pos + 1;
  const $posInsideBlockContainer = doc.resolve(posInsideBlockContainer);
  const depth = $posInsideBlockContainer.depth;

  const startPos = $posInsideBlockContainer.start(depth);
  const endPos = $posInsideBlockContainer.end(depth);

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
