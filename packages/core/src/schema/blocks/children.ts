import type { Node, NodeType, Schema } from "prosemirror-model";

import type { BlockConfig, ChildrenConfig } from "./types.js";

export const CHILD_CONTAINER_GROUP = "childContainer";

export const BLOCK_GROUP_CHILD_GROUP = "blockGroupChild";

// Whether `type` is a node that holds child blocks directly: a container
// block's own node. A container is a child-holding node that is itself a
// block; `blockGroup` also holds children but is not a block (it's regular
// blocks' nesting machinery), so the `bnBlock` check excludes it.
export function isContainerNode(type: NodeType): boolean {
  return type.isInGroup(CHILD_CONTAINER_GROUP) && type.isInGroup("bnBlock");
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

/** How few children a container must hold: its `min` (an `allow` list only), else 1. */
export function minChildren(children: ChildrenConfig | undefined): number {
  return children !== undefined && "min" in children ? (children.min ?? 1) : 1;
}

/**
 * The content expression for "any blocks": the `BLOCK_GROUP_CHILD_GROUP` group
 * itself, or, for a container that excludes some container types, the group's
 * other members spelled out: `blockContainer` (the node every regular block
 * shares) and the container types placeable anywhere. That takes the whole
 * schema, which is why only a container with `exclude` needs it.
 */
export function anyBlocksExpression(
  exclude: readonly string[],
  blockSpecs: Record<
    string,
    { config: Pick<BlockConfig, "container" | "placeable"> }
  >,
): string {
  if (exclude.length === 0) {
    return BLOCK_GROUP_CHILD_GROUP;
  }
  const containers = Object.entries(blockSpecs)
    .filter(
      ([type, { config }]) =>
        config.container === true &&
        config.placeable !== "namedOnly" &&
        !exclude.includes(type),
    )
    .map(([type]) => type);
  const members = ["blockContainer", ...containers];
  return members.length === 1 ? members[0] : `(${members.join(" | ")})`;
}

/**
 * Compiles a container's `children` config into its node's ProseMirror content
 * expression: which types may be its children (`allow`), followed by how few
 * of them it takes (`min`). `anyBlocks` is what `allow: "blocks"` stands for:
 * the group, unless the container excludes types (see `anyBlocksExpression`).
 */
export function childrenContentExpression(
  children: ChildrenConfig = {},
  anyBlocks: string = BLOCK_GROUP_CHILD_GROUP,
): string {
  const { allow = "blocks" } = children;
  const min = minChildren(children);

  let allowed: string;
  if (allow === "blocks") {
    allowed = anyBlocks;
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
