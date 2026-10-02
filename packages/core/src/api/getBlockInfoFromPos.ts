import { Node, type NodeType } from "prosemirror-model";
import {
  EditorState,
  NodeSelection,
  Selection,
  TextSelection,
  Transaction,
} from "prosemirror-state";

import {
  CHILD_CONTAINER_GROUP,
  isContainerNode,
  hasOwnedChildren,
} from "../schema/blocks/children.js";
import type { BlockConfig } from "../schema/blocks/types.js";

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

/** A ProseMirror node making up (part of) a block, and where it sits. */
type SingleBlockInfo = {
  /** The node itself. */
  node: Node;
  /** The position just before the node, i.e. `node`'s own position. */
  beforePos: number;
  /** The position just after the node: `beforePos + node.nodeSize`. */
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
      hasOwnedChildren: true;
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
      /**
       * What the content node holds: its block spec's `content`, which is what
       * the node's ProseMirror content expression was generated from (and what
       * a hand-written node's expression is checked against when the schema is
       * built).
       */
      contentKind: BlockConfig["content"];
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
      /** Whether children belong to this block, even before a body exists. */
      hasOwnedChildren: boolean;
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

/**
 * Whether `node` is only in the document because suggestion mode keeps deleted
 * content around: yjs marks such a node `y-attributed-delete` rather than
 * removing it, so it shares its ID with the node it stands in for.
 */
export function isSuggestedDeletionNode(node: Node): boolean {
  return node.marks.some((m) => ["y-attributed-delete"].includes(m.type.name));
}

/**
 * The block ID to address `node` by. Normally its `id` attribute, but a node
 * kept around by suggestion mode (see {@link isSuggestedDeletionNode}) shares
 * that attribute with the node it duplicates, so it gets an `-${index}` suffix
 * counting the same-ID nodes before it in `doc`.
 *
 * @throws If `node` has no `id` attribute (every block node does), or if it
 * isn't in `doc`.
 */
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

  const block: SingleBlockInfo = {
    node,
    beforePos,
    afterPos: beforePos + node.nodeSize,
  };

  if (isContainerNode(node.type)) {
    return {
      hasContent: false,
      hasOwnedChildren: true,
      block,
      children: {
        ...block,
        childrenStart: block.beforePos + 1,
        childrenEnd: block.afterPos - 1,
      },
      blockNoteType: node.type.name,
    };
  }

  if (node.type.name === "blockContainer") {
    const contentNode = node.firstChild;
    if (!contentNode || !contentNode.type.isInGroup("blockContent")) {
      throw new Error("blockContainer must start with a block content node.");
    }
    const content: SingleBlockInfo = {
      node: contentNode,
      beforePos: beforePos + 1,
      afterPos: beforePos + 1 + contentNode.nodeSize,
    };
    let children: ChildrenInfo | undefined;
    if (node.childCount > 1) {
      const holder = node.child(1);
      if (node.childCount !== 2 || holder.type.name !== "blockGroup") {
        throw new Error(
          "blockContainer may only have a blockGroup after its content.",
        );
      }
      children = {
        node: holder,
        beforePos: content.afterPos,
        afterPos: block.afterPos - 1,
        childrenStart: content.afterPos + 1,
        childrenEnd: block.afterPos - 2,
      };
    }

    // Only a node built from a block spec can be a block's content, and such a
    // node carries the spec's config, which states the content kind outright.
    // A bare node put in the `blockContent` group has no block to speak for
    // it, so it is rejected rather than guessed at.
    const blockConfig = content.node.type.spec.blockConfig;
    if (!blockConfig) {
      throw new Error(
        `Block content node "${content.node.type.name}" was not built from a ` +
          "block spec, so it has no content kind. Register it with " +
          "`createBlockSpec`/`createBlockSpecFromTiptapNode` instead of " +
          "joining the `blockContent` group directly.",
      );
    }

    return {
      hasContent: true,
      hasOwnedChildren: hasOwnedChildren(node),
      block,
      content,
      children,
      contentStart: content.beforePos + 1,
      contentEnd: content.afterPos - 1,
      contentKind: blockConfig.content,
      isContentEmpty: content.node.childCount === 0,
      // A `blockContainer` is a generic wrapper, so its type comes from the
      // content node inside it.
      blockNoteType: content.node.type.name,
    };
  }

  throw new Error(
    `Node "${node.type.name}" is not a container or blockContainer.`,
  );
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
export function getLastDescendantBlockInfo(blockInfo: BlockInfo): BlockInfo {
  // A container that allows zero children can have an empty child container,
  // in which case the block itself is the bottom one.
  while (blockInfo.children && blockInfo.children.node.childCount) {
    const child = blockInfo.children.node.lastChild!;
    blockInfo = getBlockInfoFromNode(
      child,
      blockInfo.children.childrenEnd - child.nodeSize,
    );
  }

  return blockInfo;
}

/**
 * Where blocks go relative to a reference block. `"before"`/`"after"` make
 * them siblings of it; `"first-child"`/`"last-child"` nest them inside it.
 *
 * The nested placements also cover blocks that have no children to point at:
 * a regular block's `blockGroup` is lazy (`blockContent blockGroup?`), so a
 * block without children has no child block to insert before or after. They
 * likewise cover containers that have no children to point at: a `min: 0`
 * container that is currently empty has no child block to insert before or
 * after.
 */
export type BlockPlacement = "before" | "after" | "first-child" | "last-child";

/**
 * Resolves a `placement` against a reference block into the document position
 * a node of `nodeType` should be inserted at, or `null` when the reference
 * block cannot take it there.
 *
 * Shared by `insertBlocks` and the move commands, so "does this block fit
 * here?" is answered in one place. The answer comes from the schema's content
 * matches rather than from a hand-written rule, so a container's `children`
 * config decides it.
 *
 * `wrapIn` is set when the position only becomes valid once the nodes are
 * wrapped: a regular block with no children yet has no `blockGroup` for them
 * to go in, so one is created around them.
 */
export function getInsertionPos(
  doc: Node,
  info: BlockInfo,
  placement: BlockPlacement,
  nodeType: NodeType,
): { pos: number; wrapIn?: NodeType } | null {
  if (placement === "before" || placement === "after") {
    const pos =
      placement === "before" ? info.block.beforePos : info.block.afterPos;
    const $pos = doc.resolve(pos);
    return $pos.parent.canReplaceWith($pos.index(), $pos.index(), nodeType)
      ? { pos }
      : null;
  }

  // Ordinary nesting creates its blockGroup lazily.
  if (!info.children) {
    const group = nodeType.schema.nodes["blockGroup"];
    return info.hasContent && group?.contentMatch.matchType(nodeType)
      ? { pos: info.content.afterPos, wrapIn: group }
      : null;
  }

  const last = placement === "last-child";
  while (info.children) {
    const children = info.children;
    const index = last ? children.node.childCount : 0;
    if (children.node.canReplaceWith(index, index, nodeType)) {
      return { pos: last ? children.childrenEnd : children.childrenStart };
    }
    // A restricted container can route insertion into its edge container,
    // e.g. inserting a paragraph into the last column of a column list.
    const child = last ? children.node.lastChild : children.node.firstChild;
    if (!child || !isContainerNode(child.type)) {
      break;
    }
    info = getBlockInfoFromNode(
      child,
      last ? children.childrenEnd - child.nodeSize : children.childrenStart,
    );
  }
  return null;
}

/**
 * Resolves a block to its first leaf block: the block itself when it is not a
 * container, otherwise the first leaf of its first child. Returns `null` for
 * an empty container.
 */
export function getFirstLeafBlock(info: BlockInfo): BlockInfo | null {
  while (!info.hasContent) {
    const { node, childrenStart } = info.children;
    if (!node.firstChild) {
      return null;
    }
    info = getBlockInfoFromNode(node.firstChild, childrenStart);
  }
  return info;
}

/**
 * Climbs out of containers until it reaches a position where `nodeType` fits.
 * `side` picks which edge of each climbed container to land on: `"before"` for
 * moves that put a block above the containers it leaves (Backspace move-out),
 * `"after"` for moves that put it below them (Enter-exit).
 *
 * Position-based rather than `BlockInfo`-based (unlike the descend/leaf
 * helpers above) because its input is an arbitrary gap position — a point
 * between blocks, not a block.
 */
export function ascendToInsertablePos(
  doc: Node,
  pos: number,
  nodeType: NodeType,
  side: "before" | "after" = "before",
): number | undefined {
  for (;;) {
    const $pos = doc.resolve(pos);
    const parent = $pos.node();
    if (parent.canReplaceWith($pos.index(), $pos.index(), nodeType)) {
      return pos;
    }
    if ($pos.depth > 0 && isContainerNode(parent.type)) {
      pos = side === "before" ? $pos.before() : $pos.after();
      continue;
    }
    return undefined;
  }
}

/**
 * The container ancestors of a position, outermost last, each with its block
 * id and resolution depth. Used to re-run container repair (`fixContainersById`)
 * on every container a mutation may have emptied. Position-based for the same
 * reason as `ascendToInsertablePos`: selections and mapped positions are the
 * natural inputs.
 */
export function getAncestorContainers(
  doc: Node,
  pos: number,
): { id: string; depth: number }[] {
  const $pos = doc.resolve(pos);
  const containers: { id: string; depth: number }[] = [];
  for (let depth = $pos.depth; depth > 0; depth--) {
    const ancestor = $pos.node(depth);
    if (isContainerNode(ancestor.type) && ancestor.attrs.id) {
      containers.push({ id: ancestor.attrs.id, depth });
    }
  }
  return containers;
}
