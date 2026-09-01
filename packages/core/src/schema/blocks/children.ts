import type { Node, NodeType, Schema } from "prosemirror-model";

import type { ChildDefault, ChildrenAllow, ChildrenConfig } from "./types.js";

/**
 * A {@link ChildrenConfig} with every default filled in and its `allow` sugar
 * desugared, so the code that builds, fills and repairs containers reads the
 * answer it needs instead of re-deriving it from the config.
 */
export type ResolvedChildren = {
  /** Whether regular blocks may be children, from `allow`. */
  blocks: boolean;
  /**
   * Which container types may be children, from `allow`: `true` for any of
   * them, otherwise the named types (possibly none).
   */
  containers: true | readonly string[];
  /**
   * How few children the container may hold. Compiled into its content
   * expression, so ProseMirror refills it on the way down; `whenEmptied`
   * decides what happens when it can't be met.
   */
  min: number;
  /** How many it may hold, or unbounded. Insertion stops here. */
  max: number | undefined;
  /** What to seed a fresh or refilled container with, if not a paragraph. */
  default: readonly ChildDefault[] | undefined;
  /**
   * What to do with a container that lost its last children: put `default`
   * back (a `column`, which has to keep existing), or replace the container
   * with them (a `callout` the user emptied, which should get out of the way).
   */
  whenEmptied: "refill" | "unwrap";
  /**
   * Whether editing gestures may cross the container's edge. A `column` is
   * `"open"`: backspace at its start merges into the block above. A table
   * cell is `"sealed"`: nothing implicitly moves in or out of it.
   */
  boundary: "open" | "sealed";
};

export const CHILD_CONTAINER_GROUP = "childContainer";

export const BLOCK_GROUP_CHILD_GROUP = "blockGroupChild";

// Joined by every container block placeable anywhere (`placement` other than
// `"containerOnly"`). It's what the `allow` container wildcards (`"any"`,
// `"containers"`) compile to: a containerOnly type only ever lives where a
// container names it explicitly, so it stays out of the group.
export const ANY_CONTAINER_GROUP = "anyContainer";

// Whether `type` is a node that holds child blocks directly: a container
// block's own node. A container is a child-holding node that is itself a
// block; `blockGroup` also holds children but is not a block (it's regular
// blocks' nesting machinery), so the `bnBlock` check excludes it.
export function isContainerNode(type: NodeType): boolean {
  return type.isInGroup(CHILD_CONTAINER_GROUP) && type.isInGroup("bnBlock");
}

/**
 * The regions a block node resolves into, answered once for every shape so no
 * other code asks "which shape am I":
 *
 * - a container block: its own node holds the children (`childrenHolder.node
 *   === outer`, offset 0), no content region;
 * - a `blockContainer`: a content head at offset 1, and a `blockGroup`
 *   children holder only once it has children.
 *
 * `offset` measures from just before `outer` to just before the region's
 * node, so with `beforePos` pointing at `outer`, a region's node starts at
 * `beforePos + offset` and its inside begins at `beforePos + offset + 1` —
 * uniformly across shapes.
 */
export type BlockRegions = {
  outer: Node;
  content?: { node: Node; offset: number };
  childrenHolder?: { node: Node; offset: number };
};

/**
 * The {@link BlockRegions} of a block node. Throws for anything else: every
 * caller got here holding a node it already believes is a block, so a miss is
 * a bug rather than a case to handle.
 */
export function getBlockRegions(node: Node): BlockRegions {
  if (isContainerNode(node.type)) {
    return { outer: node, childrenHolder: { node, offset: 0 } };
  }

  if (node.type.name === "blockContainer") {
    const content = node.firstChild;
    if (!content) {
      throw new Error(
        "blockContainer node has no content node. This is a bug in BlockNote.",
      );
    }
    const lastChild = node.lastChild;
    const holder =
      lastChild !== content &&
      lastChild &&
      lastChild.type.isInGroup(CHILD_CONTAINER_GROUP)
        ? { node: lastChild, offset: 1 + content.nodeSize }
        : undefined;

    return {
      outer: node,
      content: { node: content, offset: 1 },
      ...(holder ? { childrenHolder: holder } : {}),
    };
  }

  throw new Error(
    `Node "${node.type.name}" is not a block node (container or blockContainer).`,
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
 * Whether `type` is a container declared `placement: "containerOnly"`: one
 * defined only in terms of the container that holds it (a `column`), so it can
 * never stand where a regular block goes.
 *
 * The schema encodes this by keeping such types out of
 * `BLOCK_GROUP_CHILD_GROUP`, which is how ProseMirror enforces it while
 * matching content. This answers the same question from the declaration
 * itself, for code reasoning about the block rather than about what PM will
 * match.
 */
export function isContainerOnly(type: NodeType): boolean {
  return (
    isContainerNode(type) &&
    type.spec.blockConfig?.placement === "containerOnly"
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

export function resolveChildren(children: ChildrenConfig): ResolvedChildren {
  return {
    ...resolveAllow(children.allow),
    min: children.min ?? 1,
    max: children.max,
    default: children.default && withoutIds(children.default),
    whenEmptied: children.whenEmptied ?? "refill",
    boundary: children.boundary ?? "open",
  };
}

// Clears any id an untyped config wrote into a default, so each copy of the
// container gets a freshly generated one instead of a shared duplicate.
function withoutIds(blocks: readonly ChildDefault[]): ChildDefault[] {
  return blocks.map((block) => ({
    ...block,
    id: undefined,
    ...(block.children ? { children: withoutIds(block.children) } : {}),
  }));
}

function resolveAllow(
  allow: ChildrenAllow,
): Pick<ResolvedChildren, "blocks" | "containers"> {
  if (allow === "any") {
    return { blocks: true, containers: true };
  }
  if (allow === "blocks") {
    return { blocks: true, containers: [] };
  }
  if (allow === "containers") {
    return { blocks: false, containers: true };
  }
  return { blocks: false, containers: allow };
}

/**
 * Whether `node` belongs to a container with a `"sealed"` boundary, one whose
 * edge content may never implicitly cross (a table cell rather than a column).
 * Reads the block config off the node's spec.
 */
export function isSealed(node: Node): boolean {
  const children = node.type.spec.blockConfig?.children;
  return (
    children !== undefined && resolveChildren(children).boundary === "sealed"
  );
}

/**
 * Compiles a container's `children` config into its node's ProseMirror content
 * expression: which types may be its children (`allow`), followed by how many
 * of them it takes (`min`/`max`).
 */
export function childrenContentExpression(children: ChildrenConfig): string {
  const { blocks, containers, min, max } = resolveChildren(children);

  let allowed: string;
  if (blocks && containers === true) {
    // "Anything" is already a group, so use it rather than spelling out a
    // union that would need rebuilding whenever the schema gains a container
    // type.
    allowed = BLOCK_GROUP_CHILD_GROUP;
  } else {
    const terms: string[] = [];
    // `blockContainer` FIRST: PM's `fillBefore` picks the first matching type
    // in a union, and filling with `blockContainer` (rather than another
    // container) keeps auto-fill from recursing through nested containers.
    if (blocks) {
      terms.push("blockContainer");
    }
    // The wildcard is the `anyContainer` group, not `childContainer`. The
    // latter also contains `blockGroup`, which is not a block.
    if (containers === true) {
      terms.push(ANY_CONTAINER_GROUP);
    } else {
      terms.push(...containers);
    }

    if (terms.length === 0) {
      throw new Error(
        "Container `allow` permits nothing. A container must accept at least one block or container type; drop `children` entirely for a block that holds none.",
      );
    }

    allowed = terms.length === 1 ? terms[0] : `(${terms.join(" | ")})`;
  }

  if (max === undefined) {
    return allowed + (min === 0 ? "*" : min === 1 ? "+" : `{${min},}`);
  }
  if (min === max) {
    // Exactly one child needs no quantifier at all.
    return allowed + (max === 1 ? "" : `{${min}}`);
  }
  return allowed + (min === 0 && max === 1 ? "?" : `{${min},${max}}`);
}
