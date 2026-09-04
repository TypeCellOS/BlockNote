import {
  Fragment,
  type Node,
  type NodeType,
  type Schema,
} from "prosemirror-model";

import type { ChildrenConfig } from "./types.js";

/**
 * Group of every node that holds child blocks directly: the `blockGroup`
 * nesting regular blocks' children, and container blocks.
 */
export const CHILD_CONTAINER_GROUP = "childContainer";

/**
 * The schema priority every container block's node registers at. Below
 * `blockContainer`'s 50, so that when ProseMirror fills a `blockGroup` it
 * reaches for a regular block rather than nesting containers inside each other
 * forever.
 */
export const CONTAINER_NODE_PRIORITY = 40;

/**
 * Group of every node that may sit where a regular block goes: `blockContainer`
 * and container blocks placeable anywhere.
 */
export const BLOCK_GROUP_CHILD_GROUP = "blockGroupChild";

/**
 * Joined by the content node of a block whose `children` are a *compartment*:
 * a body that belongs to the block, like a callout's. Editing gestures move
 * blocks in and out of it deliberately instead of treating it as ordinary
 * indentation.
 */
export const COMPARTMENT_GROUP = "compartment";

/**
 * Whether a block config declares a *container block*: one whose own node
 * holds its children. A block that has content of its own keeps its ordinary
 * shape, and its `children` declare a compartment instead.
 */
export function isContainerConfig(config: {
  content: string;
  children?: unknown;
}): boolean {
  return config.children !== undefined && config.content === "none";
}

/**
 * Whether `node` is a block whose children are a compartment: a container
 * block, or a `blockContainer` whose block declares `children`.
 */
export function isCompartment(node: Node): boolean {
  return (
    isContainerNode(node.type) ||
    (node.type.name === "blockContainer" &&
      !!node.firstChild?.type.isInGroup(COMPARTMENT_GROUP))
  );
}

/**
 * The node holding a compartment's children, and the position just before it:
 * a container block holds them itself, a `blockContainer` in its `blockGroup`.
 * `undefined` when the block isn't a compartment, or has no children yet.
 */
export function compartmentBody(
  node: Node,
  beforePos: number,
): { node: Node; beforePos: number } | undefined {
  if (!isCompartment(node)) {
    return undefined;
  }
  if (isContainerNode(node.type)) {
    return { node, beforePos };
  }
  const group = node.lastChild;
  if (!group || group.type.name !== "blockGroup") {
    return undefined;
  }
  return {
    node: group,
    beforePos: beforePos + node.nodeSize - 1 - group.nodeSize,
  };
}

/**
 * Whether `type` is a container block: a block whose node holds its children
 * directly. `blockGroup` also holds children but is not a block.
 */
export function isContainerNode(type: NodeType): boolean {
  return type.isInGroup("bnBlock") && type.isInGroup(CHILD_CONTAINER_GROUP);
}

/**
 * Whether `type` is a container block that may only live inside another
 * container (`placement: "containerOnly"`), i.e. one the schema keeps out of
 * `blockGroup`.
 */
export function isContainerOnly(type: NodeType): boolean {
  return isContainerNode(type) && !type.isInGroup(BLOCK_GROUP_CHILD_GROUP);
}

/**
 * Whether a container that lost its children dissolves (is removed, or
 * replaced by whatever survives) rather than being kept and padded. A
 * container placeable anywhere dissolves; one that only exists inside another
 * container is that container's concern and is kept.
 */
export function containerDissolves(type: NodeType): boolean {
  return isContainerNode(type) && !isContainerOnly(type);
}

/**
 * Whether `type` holds regular blocks (`blockContainer` nodes) directly.
 * `blockGroup` and a column do; a column list, which holds only columns, does
 * not.
 */
export function holdsBlocks(type: NodeType): boolean {
  const blockContainer = type.schema.nodes["blockContainer"];
  return type.contentMatch.matchType(blockContainer) !== null;
}

/**
 * The fewest children the schema lets `type` hold: the size of the fill
 * ProseMirror would generate for an empty node of that type.
 */
export function minChildren(type: NodeType): number {
  return type.contentMatch.fillBefore(Fragment.empty, true)?.childCount ?? 0;
}

/**
 * A CSS selector matching the elements of every container block type in
 * `schema`, or `null` when the schema has none.
 */
export function containerNodeSelector(
  schema: Schema,
  filter: (type: NodeType) => boolean = () => true,
): string | null {
  const types = Object.values(schema.nodes).filter(
    (type) => isContainerNode(type) && filter(type),
  );
  if (types.length === 0) {
    return null;
  }
  return types.map((type) => `[data-node-type="${type.name}"]`).join(",");
}

/**
 * Compiles a `children` config into the container node's content expression.
 */
export function childrenContentExpression(children: ChildrenConfig): string {
  const min = children.min ?? 1;
  let allowed: string;
  if (children.allow === "any") {
    allowed = BLOCK_GROUP_CHILD_GROUP;
  } else {
    if (children.allow.length === 0) {
      throw new Error(
        "Container `allow` permits nothing. A container must accept at least one block type; drop `children` for a block that holds none.",
      );
    }
    allowed =
      children.allow.length === 1
        ? children.allow[0]
        : `(${children.allow.join(" | ")})`;
  }
  return allowed + (min === 0 ? "*" : min === 1 ? "+" : `{${min},}`);
}

/**
 * Walks into a container to the position where a block moved *into* it from
 * the outside should land: the end of its last block-holding descendant (the
 * end of a column list's last column), or its start-side counterpart.
 *
 * Returns `undefined` when nothing on that edge holds blocks.
 */
export function descendToBlockPos(
  doc: Node,
  containerBeforePos: number,
  edge: "start" | "end",
): number | undefined {
  let body = (() => {
    const node = doc.resolve(containerBeforePos).nodeAfter;
    return node ? compartmentBody(node, containerBeforePos) : undefined;
  })();

  while (body) {
    if (holdsBlocks(body.node.type)) {
      return edge === "start"
        ? body.beforePos + 1
        : body.beforePos + body.node.nodeSize - 1;
    }
    const child = edge === "start" ? body.node.firstChild : body.node.lastChild;
    if (!child) {
      return undefined;
    }
    const childBefore =
      edge === "start"
        ? body.beforePos + 1
        : body.beforePos + body.node.nodeSize - 1 - child.nodeSize;
    body = compartmentBody(child, childBefore);
  }

  return undefined;
}

/**
 * Walks outwards from `pos` to the first position where `nodeType` fits: a
 * block leaving a column ends up below the whole column list, since a column
 * list holds only columns. `undefined` when nowhere on the way out takes it.
 */
export function ascendToInsertablePos(
  doc: Node,
  pos: number,
  nodeType: NodeType,
): number | undefined {
  for (;;) {
    const $pos = doc.resolve(pos);
    const parent = $pos.node();
    if (parent.canReplaceWith($pos.index(), $pos.index(), nodeType)) {
      return pos;
    }
    if ($pos.depth === 0) {
      return undefined;
    }
    pos = $pos.after();
  }
}
