import { Node, ResolvedPos } from "prosemirror-model";
import { EditorState, Transaction } from "prosemirror-state";

import {
  CHILD_CONTAINER_GROUP,
  CONTAINER_CONTENT_GROUP,
  isContentContainerNode,
} from "../schema/blocks/children.js";

type SingleBlockInfo = {
  node: Node;
  beforePos: number;
  afterPos: number;
};

export type BlockInfo = {
  /**
   * The outer node that represents a BlockNote block. This is the node that has the ID.
   * Most of the time, this will be a blockContainer node, but it could also be a Column or ColumnList
   */
  bnBlock: SingleBlockInfo;
  /**
   * The type of BlockNote block that this node represents.
   * When dealing with a blockContainer, this is retrieved from the blockContent node, otherwise it's retrieved from the bnBlock node.
   */
  blockNoteType: string;
} & (
  | {
      // A container block (Column, ColumnList, a custom container): its own node
      // holds its children directly, and it has no `blockContent` of its own.

      /**
       * The Prosemirror node that holds block.children. For a container block,
       * this node is the same as bnBlock.
       */
      childContainer: SingleBlockInfo;
      blockContent?: undefined;
      isWrappedBlock: false;
    }
  | {
      /**
       * The Prosemirror node that holds block.children. For blockContainers, this is the blockGroup node, if it exists.
       */
      childContainer?: SingleBlockInfo;
      /**
       * The Prosemirror node that wraps block.content and has most of the props
       */
      blockContent: SingleBlockInfo;
      /**
       * Whether `bnBlock` wraps the block's content in a node of its own —
       * either a `blockContainer` (an ordinary block wrapped for nesting), or
       * a container block that has its own content as well as children. Both
       * have the same shape: a content node, then an optional child container.
       *
       * Note this is roughly the *opposite* of "is a container block": a
       * column has `isWrappedBlock: false`. Sites that need "is this literally
       * a `blockContainer`" should read `bnBlock.node.type.name`.
       */
      isWrappedBlock: true;
    }
);

export function isSuggestedDeletionNode(node: Node): boolean {
  return node.marks.some((m) => ["y-attributed-delete"].includes(m.type.name));
}

export function getNodeId(node: Node, doc: Node): string {
  const id = node.attrs.id;
  if (!id) {
    throw new Error(`Node ${node.type.name} does not have an ID`);
  }
  /**
   * In suggestion mode, yjs will insert nodes which have actually been deleted but are kept in the document with a "y-attributed-delete" mark,
   * and nodes which have been inserted but are not yet accepted by the user, with a "y-attributed-insert" mark.
   * Both of these nodes will have the same ID as the original node,
   * so we need to differentiate them by counting how many nodes with the same ID come before them in the document, and adding that count to the ID.
   */
  if (isSuggestedDeletionNode(node)) {
    // walk the doc to find the node and count it's index if others have the same ID, to differentiate them
    let index = 0;
    let found = false;
    doc.descendants((descNode: Node) => {
      if (found) {
        return false; // stop the walk
      }
      if (descNode.attrs.id === id) {
        if (descNode === node) {
          found = true;
          return false; // stop the walk
        }
        index++;
      }
      return true; // continue the walk
    });
    if (!found) {
      throw new Error(
        `Node ${node.type.name} with ID ${id} not found in document`,
      );
    }
    return `${id}-${index}`;
  }
  // TODO handle deleted nodes
  return id;
}

/**
 * Retrieves the position just before the nearest block node in a ProseMirror
 * doc, relative to a position. If the position is within a block node or its
 * descendants, the position just before it is returned. If the position is not
 * within a block node or its descendants, the position just before the next
 * closest block node is returned. If the position is beyond the last block, the
 * position just before the last block is returned.
 * @param doc The ProseMirror doc.
 * @param pos An integer position in the document.
 * @returns The position just before the nearest blockContainer node.
 */
export function getNearestBlockPos(doc: Node, pos: number) {
  const $pos = doc.resolve(pos);

  // Checks if the position provided is already just before a block node, in
  // which case we return the position.
  if ($pos.nodeAfter && $pos.nodeAfter.type.isInGroup("bnBlock")) {
    return {
      posBeforeNode: $pos.pos,
      node: $pos.nodeAfter,
    };
  }

  // Checks the node containing the position and its ancestors until a
  // block node is found and returned.
  let depth = $pos.depth;
  let node = $pos.node(depth);
  while (depth > 0) {
    if (node.type.isInGroup("bnBlock")) {
      return {
        posBeforeNode: $pos.before(depth),
        node: node,
      };
    }

    depth--;
    node = $pos.node(depth);
  }

  // If the position doesn't lie within a block node, we instead find the
  // position of the next closest one. If the position is beyond the last block,
  // we return the position of the last block. While running `doc.descendants`
  // is expensive, this case should be very rarely triggered. However, it's
  // possible for the position to sometimes be beyond the last block node. This
  // is a problem specifically when using the collaboration plugin.
  const allBlockContainerPositions: number[] = [];
  doc.descendants((node, pos) => {
    if (node.type.isInGroup("bnBlock")) {
      allBlockContainerPositions.push(pos);
    }
  });

  // eslint-disable-next-line no-console
  console.warn(`Position ${pos} is not within a blockContainer node.`);

  const resolvedPos = doc.resolve(
    allBlockContainerPositions.find((position) => position >= pos) ||
      allBlockContainerPositions[allBlockContainerPositions.length - 1],
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
 * @param bnBlockBeforePosOffset the position just before the
 * `blockContainer` node in the document.
 */
export function getBlockInfoWithManualOffset(
  node: Node,
  bnBlockBeforePosOffset: number,
): BlockInfo {
  if (!node.type.isInGroup("bnBlock")) {
    throw new Error(
      `Attempted to get bnBlock node at position but found node of different type ${node.type.name}`,
    );
  }

  const bnBlockNode = node;
  const bnBlockBeforePos = bnBlockBeforePosOffset;
  const bnBlockAfterPos = bnBlockBeforePos + bnBlockNode.nodeSize;

  const bnBlock: SingleBlockInfo = {
    node: bnBlockNode,
    beforePos: bnBlockBeforePos,
    afterPos: bnBlockAfterPos,
  };

  // A container block that has its own content is shaped like a
  // `blockContainer`: a content node followed by a node holding its children.
  // Discriminating on that shape rather than on the node's name is what lets
  // every branch written against `blockContainer` cover it too.
  const isContentContainer = isContentContainerNode(bnBlockNode);

  if (bnBlockNode.type.name === "blockContainer" || isContentContainer) {
    let blockContent: SingleBlockInfo | undefined;
    let childContainer: SingleBlockInfo | undefined;

    bnBlockNode.forEach((node, offset) => {
      const beforePos = bnBlockBeforePos + offset + 1;
      const afterPos = beforePos + node.nodeSize;

      if (
        node.type.spec.group === "blockContent" ||
        node.type.isInGroup(CONTAINER_CONTENT_GROUP)
      ) {
        blockContent = { node, beforePos, afterPos };
      } else if (node.type.isInGroup(CHILD_CONTAINER_GROUP)) {
        childContainer = { node, beforePos, afterPos };
      }
    });

    if (!blockContent) {
      throw new Error(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `${bnBlockNode.type.name} node does not contain a content node in its children: ${bnBlockNode}`,
      );
    }

    return {
      isWrappedBlock: true,
      bnBlock,
      blockContent,
      childContainer,
      // A `blockContainer` is a generic wrapper, so its type comes from the
      // content node inside it. A container block *is* its own type.
      blockNoteType: isContentContainer
        ? bnBlockNode.type.name
        : blockContent.node.type.name,
    };
  } else {
    if (!bnBlock.node.type.isInGroup("childContainer")) {
      throw new Error(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `bnBlock node is not in the childContainer group: ${bnBlock.node}`,
      );
    }

    return {
      isWrappedBlock: false,
      bnBlock: bnBlock,
      childContainer: bnBlock,
      blockNoteType: bnBlock.node.type.name,
    };
  }
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
      `Attempted to get blockContainer node at position ${resolvedPos.pos} but a node at this position does not exist`,
    );
  }
  return getBlockInfoWithManualOffset(resolvedPos.nodeAfter, resolvedPos.pos);
}

/**
 * Gets information regarding the ProseMirror nodes that make up a block. The
 * block chosen is the one currently containing the current ProseMirror
 * selection.
 * @param source The ProseMirror editor state.
 */
export function getBlockInfoFromSelection(source: EditorState | Transaction) {
  return getBlockInfoAtNearest(source, source.selection.anchor);
}

export function getBlockInfoAtNearest(
  source: EditorState | Transaction,
  pos: number,
) {
  return getBlockInfo(getNearestBlockPos(source.doc, pos));
}
