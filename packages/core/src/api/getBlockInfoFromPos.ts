import { Node } from "prosemirror-model";
import { EditorState, Transaction } from "prosemirror-state";

import {
  CHILD_CONTAINER_GROUP,
  CONTAINER_CONTENT_GROUP,
  isContentContainerNode,
  isSealed,
} from "../schema/blocks/children.js";

/**
 * Producers for {@link BlockInfo}, named by the input you already have:
 *
 * - `getBlockInfoFromNode(node, beforePos)` — you hold the block's ProseMirror
 *   node and the position just before it.
 * - `getBlockInfoAt(doc, posBeforeBlock)` — you know the exact position just
 *   before a block node (throws if no node starts there).
 * - `getBlockInfoNearPos(source, pos)` — you have an arbitrary position; walks
 *   up/over to the nearest block.
 * - `getBlockInfoFromSelection(source)` — you want the block containing the
 *   current selection anchor.
 */

type SingleBlockInfo = {
  node: Node;
  beforePos: number;
  afterPos: number;
};

/**
 * The node holding a block's children, plus the bounds of the child range.
 */
export type ChildrenInfo = SingleBlockInfo & {
  /**
   * `beforePos + 1`: the position of the first child; also the insertion
   * position for a new first child.
   */
  childrenStart: number;
  /** `afterPos - 1`: the position just after the last child. */
  childrenEnd: number;
};

/**
 * What a block's content node holds, derived from its ProseMirror content
 * expression.
 */
export type BlockContentKind = "inline" | "none" | "table" | "other";

function getContentKind(contentNode: Node): BlockContentKind {
  const content = contentNode.type.spec.content;
  return content === "inline*"
    ? "inline"
    : content === ""
      ? "none"
      : content === "tableRow+"
        ? "table"
        : "other";
}

function toChildrenInfo(info: SingleBlockInfo): ChildrenInfo {
  return {
    ...info,
    childrenStart: info.beforePos + 1,
    childrenEnd: info.afterPos - 1,
  };
}

export type BlockInfo = {
  /**
   * The outer node that represents a BlockNote block. This is the node that has the ID.
   * Most of the time, this will be a blockContainer node, but it could also be a Column or ColumnList
   */
  block: SingleBlockInfo;
  /**
   * The type of BlockNote block that this node represents.
   * When dealing with a blockContainer, this is retrieved from the content node, otherwise it's retrieved from the block node.
   */
  blockNoteType: string;
} & (
  | {
      // A container block (Column, ColumnList, a custom container): its own
      // node holds its children directly, and it has no content node of
      // its own.

      /**
       * The Prosemirror node that holds block.children. For a container block,
       * this node is the same as `block`.
       */
      children: ChildrenInfo;
      content?: undefined;
      hasContent: false;
      contentStart?: undefined;
      contentEnd?: undefined;
      contentKind?: undefined;
      isContentEmpty?: undefined;
    }
  | {
      /**
       * The Prosemirror node that holds block.children. For blockContainers, this is the blockGroup node, if it exists.
       */
      children?: ChildrenInfo;
      /**
       * The Prosemirror node that wraps block.content and has most of the props
       */
      content: SingleBlockInfo;
      /** `content.beforePos + 1`: the first position inside the content. */
      contentStart: number;
      /** `content.afterPos - 1`: the last position inside the content. */
      contentEnd: number;
      /** What the content node holds, from its ProseMirror content expression. */
      contentKind: BlockContentKind;
      /** `content.node.childCount === 0`. */
      isContentEmpty: boolean;
      /**
       * Whether the block has a content node: either a `blockContainer` (an
       * ordinary block wrapped for nesting), or a container block that has its
       * own content as well as children. Both have the same shape: a content
       * node, then an optional child container.
       *
       * Note this is roughly the opposite of "is a container block": a
       * column has `hasContent: false`. Sites that need "is this literally
       * a `blockContainer`" should read `block.node.type.name`.
       */
      hasContent: true;
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
 * BlockNote document, given the block's outer node and the position just
 * before it. This includes the outer node with the block's ID, the content
 * node with the block's main body, and the optional node which contains the
 * block's children. As well as the nodes, also returns the ProseMirror
 * positions just before & after each node.
 * @param node The outer node that the block information should be retrieved
 * from.
 * @param beforePos The position just before the outer node in the document.
 */
export function getBlockInfoFromNode(node: Node, beforePos: number): BlockInfo {
  if (!node.type.isInGroup("bnBlock")) {
    throw new Error(
      `Attempted to get block node at position but found node of different type ${node.type.name}`,
    );
  }

  const blockNode = node;
  const blockBeforePos = beforePos;
  const blockAfterPos = blockBeforePos + blockNode.nodeSize;

  const block: SingleBlockInfo = {
    node: blockNode,
    beforePos: blockBeforePos,
    afterPos: blockAfterPos,
  };

  // A container block that has its own content is shaped like a
  // `blockContainer`: a content node followed by a node holding its children.
  // Discriminating on that shape rather than on the node's name lets every
  // branch written against `blockContainer` cover it too.
  const isContentContainer = isContentContainerNode(blockNode);

  if (blockNode.type.name === "blockContainer" || isContentContainer) {
    let content: SingleBlockInfo | undefined;
    let children: SingleBlockInfo | undefined;

    blockNode.forEach((node, offset) => {
      const beforePos = blockBeforePos + offset + 1;
      const afterPos = beforePos + node.nodeSize;

      if (
        node.type.spec.group === "blockContent" ||
        node.type.isInGroup(CONTAINER_CONTENT_GROUP)
      ) {
        content = { node, beforePos, afterPos };
      } else if (node.type.isInGroup(CHILD_CONTAINER_GROUP)) {
        children = { node, beforePos, afterPos };
      }
    });

    if (!content) {
      throw new Error(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `${blockNode.type.name} node does not contain a content node in its children: ${blockNode}`,
      );
    }

    return {
      hasContent: true,
      block,
      content,
      children: children && toChildrenInfo(children),
      contentStart: content.beforePos + 1,
      contentEnd: content.afterPos - 1,
      contentKind: getContentKind(content.node),
      isContentEmpty: content.node.childCount === 0,
      // A `blockContainer` is a generic wrapper, so its type comes from the
      // content node inside it. A container block's node type is the block
      // type itself.
      blockNoteType: isContentContainer
        ? blockNode.type.name
        : content.node.type.name,
    };
  } else {
    if (!block.node.type.isInGroup("childContainer")) {
      throw new Error(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `block node is not in the childContainer group: ${block.node}`,
      );
    }

    return {
      hasContent: false,
      block,
      children: toChildrenInfo(block),
      blockNoteType: block.node.type.name,
    };
  }
}

/**
 * Gets information regarding the ProseMirror nodes that make up a block, given
 * a position known to be just before a block node. Throws if no node starts at
 * that position.
 * @param doc The ProseMirror doc.
 * @param posBeforeBlock The position just before the block's outer node.
 */
export function getBlockInfoAt(doc: Node, posBeforeBlock: number): BlockInfo {
  const $pos = doc.resolve(posBeforeBlock);
  if (!$pos.nodeAfter) {
    throw new Error(
      `Attempted to get block node at position ${posBeforeBlock} but a node at this position does not exist`,
    );
  }
  return getBlockInfoFromNode($pos.nodeAfter, $pos.pos);
}

/**
 * Gets information regarding the ProseMirror nodes that make up the block
 * nearest to an arbitrary position (see {@link getNearestBlockPos}).
 * @param source The ProseMirror editor state or transaction.
 * @param pos An integer position in the document.
 */
export function getBlockInfoNearPos(
  source: EditorState | Transaction,
  pos: number,
): BlockInfo {
  const posInfo = getNearestBlockPos(source.doc, pos);
  return getBlockInfoFromNode(posInfo.node, posInfo.posBeforeNode);
}

/**
 * Gets information regarding the ProseMirror nodes that make up the block
 * containing the current ProseMirror selection anchor.
 * @param source The ProseMirror editor state or transaction.
 */
export function getBlockInfoFromSelection(source: EditorState | Transaction) {
  return getBlockInfoNearPos(source, source.selection.anchor);
}

/**
 * Returns the block info from the parent block
 * or undefined if we're at the root
 */
export function getParentBlockInfo(
  doc: Node,
  beforePos: number,
): BlockInfo | undefined {
  const $pos = doc.resolve(beforePos);
  const depth = $pos.depth - 1;

  if (depth < 1) {
    return undefined;
  }

  const parentBeforePos = $pos.before(depth);
  const parentNode = doc.resolve(parentBeforePos).nodeAfter;

  if (!parentNode) {
    return undefined;
  }

  if (!parentNode.type.spec.group?.includes("bnBlock")) {
    return getParentBlockInfo(doc, parentBeforePos);
  }

  return getBlockInfoAt(doc, parentBeforePos);
}

/**
 * Returns the block info from the sibling block before (above) the given block,
 * or undefined if the given block is the first sibling.
 */
export function getPrevBlockInfo(
  doc: Node,
  beforePos: number,
): BlockInfo | undefined {
  const $pos = doc.resolve(beforePos);

  const indexInParent = $pos.index();

  if (indexInParent === 0) {
    return undefined;
  }

  const prevBlockBeforePos = $pos.posAtIndex(indexInParent - 1);

  return getBlockInfoAt(doc, prevBlockBeforePos);
}

/**
 * Returns the block info from the sibling block after (below) the given block,
 * or undefined if the given block is the last sibling.
 */
export function getNextBlockInfo(
  doc: Node,
  beforePos: number,
): BlockInfo | undefined {
  const $pos = doc.resolve(beforePos);

  const indexInParent = $pos.index();

  if (indexInParent === $pos.node().childCount - 1) {
    return undefined;
  }

  const nextBlockBeforePos = $pos.posAtIndex(indexInParent + 1);

  return getBlockInfoAt(doc, nextBlockBeforePos);
}

/**
 * If a block has children like this:
 * A
 * - B
 * - C
 * -- D
 *
 * Then the last descendant block returned is D.
 */
export function getLastDescendantBlockInfo(
  doc: Node,
  blockInfo: BlockInfo,
  // Callers that move content stop the descent at a sealed container, getting
  // the container itself rather than a block inside it. Caret-only callers
  // descend through. Sealed boundaries govern content, not navigation.
  opts?: { stopAtSealed?: boolean },
): BlockInfo {
  // A container that allows zero children can have an empty child container,
  // in which case the block itself is the bottom one.
  while (blockInfo.children && blockInfo.children.node.childCount) {
    if (opts?.stopAtSealed && isSealed(blockInfo.children.node)) {
      break;
    }
    const group = blockInfo.children.node;

    const newPos = doc
      .resolve(blockInfo.children.beforePos + 1)
      .posAtIndex(group.childCount - 1);
    blockInfo = getBlockInfoAt(doc, newPos);
  }

  return blockInfo;
}
