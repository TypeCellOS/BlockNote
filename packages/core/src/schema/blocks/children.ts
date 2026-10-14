import type { Node, NodeType, Schema } from "prosemirror-model";

import type { BlockConfig, ChildrenConfig } from "./types.js";

export const CHILD_CONTAINER_GROUP = "childContainer";

export const BLOCK_GROUP_CHILD_GROUP = "blockGroupChild";

// Naming: a "layout block" is a block declared `layoutOnly: true`, whose own
// node holds its child blocks. Two older names with "container" mean
// something else:
// - `blockContainer` is the node around every other block (its content node
//   plus an optional `blockGroup` of children). Its name is kept because it
//   is stored in documents.
// - `childContainer` (`CHILD_CONTAINER_GROUP`) is the node group of every
//   node that holds a block's children: `blockGroup` and the nodes of layout
//   blocks.
//
// Whether `type` is the node of a layout block: a node that holds child
// blocks directly and is itself a block. `blockGroup` also holds children but
// is not a block (it's regular blocks' nesting machinery), so the `bnBlock`
// check excludes it.
export function isLayoutNode(type: NodeType): boolean {
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
 * Whether `type` is a layout block declared `placeable: "namedOnly"`: one
 * defined only in terms of the layout block that holds it (a `column`), so it can
 * never stand where a regular block goes.
 *
 * The schema encodes this by keeping such types out of
 * `BLOCK_GROUP_CHILD_GROUP`, which is how ProseMirror enforces it while
 * matching content. This answers the same question from the declaration
 * itself, for code reasoning about the block rather than about what PM will
 * match.
 */
export function isNamedOnly(type: NodeType): boolean {
  return isLayoutNode(type) && type.spec.blockConfig?.placeable === "namedOnly";
}

// Below `blockContainer`'s priority (50) so PM's `fillBefore` picks
// `blockContainer` first, avoiding recursion through nested layout blocks.
export const LAYOUT_NODE_PRIORITY = 40;

const LAYOUT_PRIORITY_BAND = { min: 30, max: 49 };
const DEFAULT_SPEC_PRIORITY = 101;

// Maps `sortByDependencies` priority into the layout block band (30–49).
// Preserves relative order but keeps all layout blocks below regular blocks.
export function layoutNodePriority(priority: number | undefined): number {
  if (priority === undefined) {
    return LAYOUT_NODE_PRIORITY;
  }

  const steps = Math.round((priority - DEFAULT_SPEC_PRIORITY) / 10);

  return Math.min(
    LAYOUT_PRIORITY_BAND.max,
    Math.max(LAYOUT_PRIORITY_BAND.min, LAYOUT_NODE_PRIORITY + steps),
  );
}

/** How few children a layout block must hold: its `min` (an `allow` list only), else 1. */
export function minChildren(children: ChildrenConfig | undefined): number {
  return children !== undefined && "min" in children ? (children.min ?? 1) : 1;
}

/**
 * The content expression for "any blocks": the `BLOCK_GROUP_CHILD_GROUP` group
 * itself, or, for a layout block that excludes some layout block types, the group's
 * other members spelled out: `blockContainer` (the node every regular block
 * shares) and the layout block types placeable anywhere. That takes the whole
 * schema, which is why only a layout block with `exclude` needs it.
 */
export function anyBlocksExpression(
  exclude: readonly string[],
  blockSpecs: Record<
    string,
    { config: Pick<BlockConfig, "layoutOnly" | "placeable"> }
  >,
): string {
  if (exclude.length === 0) {
    return BLOCK_GROUP_CHILD_GROUP;
  }
  const layoutBlocks = Object.entries(blockSpecs)
    .filter(
      ([type, { config }]) =>
        config.layoutOnly === true &&
        config.placeable !== "namedOnly" &&
        !exclude.includes(type),
    )
    .map(([type]) => type);
  const members = ["blockContainer", ...layoutBlocks];
  return members.length === 1 ? members[0] : `(${members.join(" | ")})`;
}

/**
 * Compiles a layout block's `children` config into its node's ProseMirror content
 * expression: which types may be its children (`allow`), followed by how few
 * of them it takes (`min`). `anyBlocks` is what `allow: "blocks"` stands for:
 * the group, unless the layout block excludes types (see `anyBlocksExpression`).
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
        "Layout block `allow` permits nothing. A layout block must accept at least one block or layout block type; drop `children` entirely for a block that holds none.",
      );
    }

    allowed = allow.length === 1 ? allow[0] : `(${allow.join(" | ")})`;
  }

  return allowed + (min === 0 ? "*" : min === 1 ? "+" : `{${min},}`);
}
