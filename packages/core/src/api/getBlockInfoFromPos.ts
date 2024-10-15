import { Node, ResolvedPos } from "prosemirror-model";
import { EditorState } from "prosemirror-state";

type SingleBlockInfo = {
  node: Node;
  beforePos: number;
  afterPos: number;
};

export type BlockInfo = {
  blockContainer: SingleBlockInfo;
  blockContent: SingleBlockInfo;
  blockGroup?: SingleBlockInfo;
};

/**
 * Retrieves the position just before the nearest blockContainer node in a
 * ProseMirror doc, relative to a position. If the position is within a
 * blockContainer node or its descendants, the position just before it is
 * returned. If the position is not within a blockContainer node or its
 * descendants, the position just before the next closest blockContainer node
 * is returned. If the position is beyond the last blockContainer, the position
 * just before the last blockContainer is returned.
 * @param doc The ProseMirror doc.
 * @param pos An integer position in the document.
 * @returns The position just before the nearest blockContainer node.
 */
export function getNearestBlockContainerPos(doc: Node, pos: number) {
  const $pos = doc.resolve(pos);

  // Checks if the position provided is already just before a blockContainer
  // node, in which case we return the position.
  if ($pos.nodeAfter && $pos.nodeAfter.type.name === "blockContainer") {
    return {
      posBeforeNode: $pos.pos,
      node: $pos.nodeAfter,
    };
  }

  // Checks the node containing the position and its ancestors until a
  // blockContainer node is found and returned.
  let depth = $pos.depth;
  let node = $pos.node(depth);
  while (depth > 0) {
    if (node.type.name === "blockContainer") {
      return {
        posBeforeNode: $pos.before(depth),
        node: node,
      };
    }

    depth--;
    node = $pos.node(depth);
  }

  // If the position doesn't lie within a blockContainer node, we instead find
  // the position of the next closest one. If the position is beyond the last
  // blockContainer, we return the position of the last blockContainer. While
  // running `doc.descendants` is expensive, this case should be very rarely
  // triggered. However, it's possible for the position to sometimes be beyond
  // the last blockContainer node. This is a problem specifically when using the
  // collaboration plugin.
  const allBlockContainerPositions: number[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "blockContainer") {
      allBlockContainerPositions.push(pos);
    }
  });

  // eslint-disable-next-line no-console
  console.warn(`Position ${pos} is not within a blockContainer node.`);

  const resolvedPos = doc.resolve(
    allBlockContainerPositions.find((position) => position >= pos) ||
      allBlockContainerPositions[allBlockContainerPositions.length - 1]
  );
  return {
    posBeforeNode: resolvedPos.pos,
    node: resolvedPos.nodeAfter!,
  };
}

/**
 * Gets information regarding the ProseMirror nodes that make up a block in a
 * BlockNote document. This includes the main `blockContainer` node, the
 * `blockContent` node with the block's main body, and the optional `blockGroup`
 * node which contains the block's children. As well as the nodes, also returns
 * the ProseMirror positions just before & after each node.
 * @param node The main `blockContainer` node that the block information should
 * be retrieved from,
 * @param blockContainerBeforePosOffset the position just before the
 * `blockContainer` node in the document.
 */
export function getBlockInfoWithManualOffset(
  node: Node,
  blockContainerBeforePosOffset: number
): BlockInfo {
  const blockContainerNode = node;
  const blockContainerBeforePos = blockContainerBeforePosOffset;
  const blockContainerAfterPos =
    blockContainerBeforePos + blockContainerNode.nodeSize;

  const blockContainer: SingleBlockInfo = {
    node: blockContainerNode,
    beforePos: blockContainerBeforePos,
    afterPos: blockContainerAfterPos,
  };
  let blockContent: SingleBlockInfo | undefined = undefined;
  let blockGroup: SingleBlockInfo | undefined = undefined;

  blockContainerNode.forEach((node, offset) => {
    if (node.type.spec.group === "blockContent") {
      // console.log(beforePos, offset);
      const blockContentNode = node;
      const blockContentBeforePos = blockContainerBeforePos + offset + 1;
      const blockContentAfterPos = blockContentBeforePos + node.nodeSize;

      blockContent = {
        node: blockContentNode,
        beforePos: blockContentBeforePos,
        afterPos: blockContentAfterPos,
      };
    } else if (node.type.name === "blockGroup") {
      const blockGroupNode = node;
      const blockGroupBeforePos = blockContainerBeforePos + offset + 1;
      const blockGroupAfterPos = blockGroupBeforePos + node.nodeSize;

      blockGroup = {
        node: blockGroupNode,
        beforePos: blockGroupBeforePos,
        afterPos: blockGroupAfterPos,
      };
    }
  });

  if (!blockContent) {
    throw new Error(
      `blockContainer node does not contain a blockContent node in its children: ${blockContainerNode}`
    );
  }

  return {
    blockContainer,
    blockContent,
    blockGroup,
  };
}

/**
 * Gets information regarding the ProseMirror nodes that make up a block in a
 * BlockNote document. This includes the main `blockContainer` node, the
 * `blockContent` node with the block's main body, and the optional `blockGroup`
 * node which contains the block's children. As well as the nodes, also returns
 * the ProseMirror positions just before & after each node.
 * @param posInfo An object with the main `blockContainer` node that the block
 * information should be retrieved from, and the position just before it in the
 * document.
 */
export function getBlockInfo(posInfo: { posBeforeNode: number; node: Node }) {
  return getBlockInfoWithManualOffset(posInfo.node, posInfo.posBeforeNode);
}

/**
 * Gets information regarding the ProseMirror nodes that make up a block from a
 * resolved position just before the `blockContainer` node in the document that
 * corresponds to it.
 * @param resolvedPos The resolved position just before the `blockContainer`
 * node.
 */
export function getBlockInfoFromResolvedPos(resolvedPos: ResolvedPos) {
  if (!resolvedPos.nodeAfter) {
    throw new Error(
      `Attempted to get blockContainer node at position ${resolvedPos.pos} but a node at this position does not exist`
    );
  }
  if (resolvedPos.nodeAfter.type.name !== "blockContainer") {
    throw new Error(
      `Attempted to get blockContainer node at position ${resolvedPos.pos} but found node of different type ${resolvedPos.nodeAfter}`
    );
  }
  return getBlockInfoWithManualOffset(resolvedPos.nodeAfter, resolvedPos.pos);
}

/**
 * Gets information regarding the ProseMirror nodes that make up a block. The
 * block chosen is the one currently containing the current ProseMirror
 * selection.
 * @param state The ProseMirror editor state.
 */
export function getBlockInfoFromSelection(state: EditorState) {
  const posInfo = getNearestBlockContainerPos(
    state.doc,
    state.selection.anchor
  );
  return getBlockInfo(posInfo);
}
