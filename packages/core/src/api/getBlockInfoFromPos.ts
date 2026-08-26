import { Node } from "prosemirror-model";
import {
  EditorState,
  NodeSelection,
  Selection,
  TextSelection,
  Transaction,
} from "prosemirror-state";

import {
  CHILD_CONTAINER_GROUP,
  getBlockRegions,
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
export type BlockContentKind = "inline" | "plain" | "none" | "table" | "other";

function getContentKind(contentNode: Node): BlockContentKind {
  const content = contentNode.type.spec.content;
  return content === "inline*"
    ? "inline"
    : content === "text*"
      ? "plain"
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
       * Whether the block has a content node: a `blockContainer` (an
       * ordinary block wrapped for nesting), shaped as a content node
       * followed by an optional child container.
       *
       * Note this is the opposite of "is a container block": a column has
       * `hasContent: false`.
       */
      hasContent: true;
    }
);

/**
 * The caret position at an edge of a table content region: 4 levels in
 * (`table` → `tableRow` → `tableCell` → `tableParagraph`) from the region's
 * boundary — the first cell's paragraph start, or the last cell's paragraph
 * end.
 */
export function tableContentCaretPos(
  content: { beforePos: number; afterPos: number },
  edge: "start" | "end",
): number {
  return edge === "start" ? content.beforePos + 4 : content.afterPos - 4;
}

/**
 * The caret position at an edge of a block's content, or `null` when the block
 * has none there: a container block, or content that holds no text (an image).
 */
export function blockEdgePos(
  info: BlockInfo,
  edge: "start" | "end",
): number | null {
  if (!info.hasContent || info.contentKind === "none") {
    return null;
  }
  return info.contentKind === "table"
    ? tableContentCaretPos(info.content, edge)
    : edge === "start"
      ? info.contentStart
      : info.contentEnd;
}

/**
 * A selection at an edge of a block. A container resolves to the same edge of
 * its first/last child, recursively. Where there is no caret position the
 * nearest node is selected instead: the content node of a block holding no
 * text, or the block itself for a container holding no children.
 */
export function blockEdgeSelection(
  doc: Node,
  info: BlockInfo,
  edge: "start" | "end",
): Selection {
  const pos = blockEdgePos(info, edge);
  if (pos !== null) {
    return TextSelection.create(doc, pos);
  }
  if (info.hasContent) {
    return NodeSelection.create(doc, info.content.beforePos);
  }

  const { node, childrenStart, childrenEnd } = info.children;
  const child = edge === "start" ? node.firstChild : node.lastChild;
  if (!child) {
    return NodeSelection.create(doc, info.block.beforePos);
  }
  return blockEdgeSelection(
    doc,
    getBlockInfoFromNode(
      child,
      edge === "start" ? childrenStart : childrenEnd - child.nodeSize,
    ),
    edge,
  );
}

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

  // The one place block shape is resolved; everything below is position
  // annotation over the regions.
  const regions = getBlockRegions(node);

  const block: SingleBlockInfo = {
    node,
    beforePos,
    afterPos: beforePos + node.nodeSize,
  };

  if (regions.content) {
    const content: SingleBlockInfo = {
      node: regions.content.node,
      beforePos: beforePos + regions.content.offset,
      afterPos:
        beforePos + regions.content.offset + regions.content.node.nodeSize,
    };
    const holder = regions.childrenHolder;
    return {
      hasContent: true,
      block,
      content,
      children: holder
        ? toChildrenInfo({
            node: holder.node,
            beforePos: beforePos + holder.offset,
            afterPos: beforePos + holder.offset + holder.node.nodeSize,
          })
        : undefined,
      contentStart: content.beforePos + 1,
      contentEnd: content.afterPos - 1,
      contentKind: getContentKind(content.node),
      isContentEmpty: content.node.childCount === 0,
      // A `blockContainer` is a generic wrapper, so its type comes from the
      // content node inside it.
      blockNoteType: content.node.type.name,
    };
  }

  return {
    hasContent: false,
    block,
    // A container holds its children directly, so the holder is the block
    // node itself.
    children: toChildrenInfo(block),
    blockNoteType: node.type.name,
  };
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
 * The parent block's info: the block whose `children` contains the block at
 * `posBeforeBlock`, or `undefined` for a top-level block. A container is the
 * parent of its direct children (a block inside a column → the column, not
 * the columnList); a regular block's children live in its `blockGroup`, so
 * the parent is the group's own parent.
 */
export function getParentBlockInfo(
  doc: Node,
  posBeforeBlock: number,
): BlockInfo | undefined {
  const $pos = doc.resolve(posBeforeBlock);
  const parent = $pos.node();

  if (parent.type.isInGroup("bnBlock")) {
    return getBlockInfoAt(doc, $pos.before($pos.depth));
  }
  // A `blockGroup`: its own parent block is the real parent, unless it's the
  // document root group.
  if (parent.type.isInGroup(CHILD_CONTAINER_GROUP) && $pos.depth > 1) {
    return getBlockInfoAt(doc, $pos.before($pos.depth - 1));
  }
  return undefined;
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
