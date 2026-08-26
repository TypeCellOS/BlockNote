import type { Node, NodeType, Schema } from "prosemirror-model";

import type {
  ChildrenAllow,
  ChildrenConfig,
  PartialBlockNoDefaults,
} from "./types.js";

/** A {@link ChildrenConfig} with every default filled in. */
export type ResolvedChildren = {
  blocks: boolean;
  /** `true` for any container type; a (possibly empty) list otherwise. */
  containers: true | readonly string[];
  /** What `whenEmptied` compares against. */
  min: number;
  max: number | undefined;
  default: readonly PartialBlockNoDefaults<any, any, any>[] | undefined;
  whenEmptied: "refill" | "unwrap";
  boundary: "open" | "isolated" | "sealed";
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

// Whether a node of `type` can sit where regular blocks go: as a direct child
// of a `blockGroup` or of an `allow: "any"` container. `blockContainer` and
// every anywhere-placeable container qualify; `containerOnly` containers
// don't, and must be dissolved into their children before landing in such a
// slot (see `dissolveContainerOnlyBlocks` in `moveBlocks.ts`).
export function isBlockGroupInsertable(type: NodeType): boolean {
  return type.isInGroup(BLOCK_GROUP_CHILD_GROUP);
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

const resolvedCache = new WeakMap<ChildrenConfig, ResolvedChildren>();

export function resolveChildren(children: ChildrenConfig): ResolvedChildren {
  const cached = resolvedCache.get(children);
  if (cached) {
    return cached;
  }

  const resolved: ResolvedChildren = {
    ...resolveAllow(children.allow),
    min: children.min ?? 1,
    max: children.max,
    default: children.default,
    whenEmptied: children.whenEmptied ?? "refill",
    boundary: children.boundary ?? "isolated",
  };

  resolvedCache.set(children, resolved);
  return resolved;
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

export function childrenContentExpression(children: ChildrenConfig): string {
  const resolved = resolveChildren(children);
  return allowTerm(resolved) + quantifier(resolved.min, resolved.max);
}

function allowTerm(resolved: ResolvedChildren): string {
  // "Anything" is already a group, so use it rather than spelling out a union
  // that would need rebuilding whenever the schema gains a container type.
  if (resolved.blocks && resolved.containers === true) {
    return BLOCK_GROUP_CHILD_GROUP;
  }

  const terms: string[] = [];
  // `blockContainer` FIRST: PM's `fillBefore` picks the first matching type in
  // a union, and filling with `blockContainer` (rather than another container)
  // keeps auto-fill from recursing through nested containers.
  if (resolved.blocks) {
    terms.push("blockContainer");
  }
  // The wildcard is the `anyContainer` group, not `childContainer`. The
  // latter also contains `blockGroup`, which is not a block.
  if (resolved.containers === true) {
    terms.push(ANY_CONTAINER_GROUP);
  } else {
    terms.push(...resolved.containers);
  }

  if (terms.length === 0) {
    throw new Error(
      "Container `allow` permits nothing. A container must accept at least one block or container type; drop `children` entirely for a block that holds none.",
    );
  }

  return terms.length === 1 ? terms[0] : `(${terms.join(" | ")})`;
}

function quantifier(min: number, max: number | undefined): string {
  if (max === undefined) {
    if (min === 0) {
      return "*";
    }
    if (min === 1) {
      return "+";
    }
    return `{${min},}`;
  }
  if (min === max) {
    return max === 1 ? "" : `{${min}}`;
  }
  if (min === 0 && max === 1) {
    return "?";
  }
  return `{${min},${max}}`;
}
