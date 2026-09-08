import type { Node, NodeType, Schema } from "prosemirror-model";

import type { ChildrenConfig } from "./types.js";

export const CHILD_CONTAINER_GROUP = "childContainer";

export const BLOCK_GROUP_CHILD_GROUP = "blockGroupChild";

/**
 * Joined by the content node of a block whose `children` are owned children:
 * a body that belongs to the block, like a callout's. Editing gestures move
 * blocks in and out of it deliberately instead of treating it as ordinary
 * indentation.
 */
export const OWNED_CHILDREN_GROUP = "ownedChildren";

/**
 * Whether a block config declares a *container block*: one whose own node
 * holds its children. A block that has content of its own keeps its ordinary
 * shape, and its `children` declare owned children instead.
 * @internal
 */
export function isContainerConfig(config: {
  content: string;
  children?: unknown;
}): boolean {
  return config.children !== undefined && config.content === "none";
}

// Whether `type` is a node that holds child blocks directly: a container
// block's own node. A container is a child-holding node that is itself a
// block; `blockGroup` also holds children but is not a block (it's regular
// blocks' nesting machinery), so the `bnBlock` check excludes it.
export function isContainerNode(type: NodeType): boolean {
  return type.isInGroup(CHILD_CONTAINER_GROUP) && type.isInGroup("bnBlock");
}

/**
 * Whether `node` is a block whose children are owned children: a container
 * block, or a `blockContainer` whose block declares `children` (its content
 * node joined {@link OWNED_CHILDREN_GROUP}).
 */
export function hasOwnedChildren(node: Node): boolean {
  return (
    isContainerNode(node.type) ||
    (node.type.name === "blockContainer" &&
      !!node.firstChild?.type.isInGroup(OWNED_CHILDREN_GROUP))
  );
}

// Builds the `blockGroup` node that holds a block's children when converting
// blocks to nodes. Transaction-level nesting (`sinkItem`, `findWrapping` in the
// keyboard shortcuts) wraps existing nodes in a `blockGroup` instead, and the
// document's root `blockGroup` is created by the parsers and `y`/`yjs` utils.
export function createBlockGroup(
  schema: Schema,
  children: readonly Node[],
): Node {
  return schema.nodes["blockGroup"].createChecked({}, children as Node[]);
}

/**
 * Whether `type` is a container declared `placeable: "namedOnly"`: one
 * defined only in terms of the container that holds it (a `column`), so it can
 * never stand where a regular block goes.
 *
 * The schema encodes this by keeping such types out of
 * `BLOCK_GROUP_CHILD_GROUP`, which is how ProseMirror enforces it while
 * matching content. This answers the same question from the declaration
 * itself, for code reasoning about the block rather than about what PM will
 * match.
 */
export function isNamedOnly(type: NodeType): boolean {
  return (
    isContainerNode(type) && type.spec.blockConfig?.placeable === "namedOnly"
  );
}

// Below `blockContainer`'s priority (50) so PM's `fillBefore` picks
// `blockContainer` first, avoiding recursion through nested containers.
export const CONTAINER_NODE_PRIORITY = 40;

const CONTAINER_PRIORITY_BAND = { min: 30, max: 49 };
const DEFAULT_SPEC_PRIORITY = 101;

// Maps `sortByDependencies` priority into the container band (30–49).
// Preserves relative order but keeps all containers below regular blocks.
export function containerNodePriority(priority: number | undefined): number {
  if (priority === undefined) {
    return CONTAINER_NODE_PRIORITY;
  }

  const steps = Math.round((priority - DEFAULT_SPEC_PRIORITY) / 10);

  return Math.min(
    CONTAINER_PRIORITY_BAND.max,
    Math.max(CONTAINER_PRIORITY_BAND.min, CONTAINER_NODE_PRIORITY + steps),
  );
}

/**
 * Compiles a container's `children` config into its node's ProseMirror content
 * expression: which types may be its children (`allow`), followed by how few
 * of them it takes (`min`).
 */
export function childrenContentExpression(children: ChildrenConfig): string {
  const { allow, min = 1 } = children;

  let allowed: string;
  if (allow === "blocks") {
    // "Anything" is already a group, so use it rather than spelling out a
    // union that would need rebuilding whenever the schema gains a container
    // type.
    allowed = BLOCK_GROUP_CHILD_GROUP;
  } else {
    if (allow.length === 0) {
      throw new Error(
        "Container `allow` permits nothing. A container must accept at least one block or container type; drop `children` entirely for a block that holds none.",
      );
    }

    allowed = allow.length === 1 ? allow[0] : `(${allow.join(" | ")})`;
  }

  return allowed + (min === 0 ? "*" : min === 1 ? "+" : `{${min},}`);
}
