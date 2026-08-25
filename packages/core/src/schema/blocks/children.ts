import type { Node, NodeType } from "prosemirror-model";

import type {
  BlockConfig,
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
// block's own node. (`blockGroup` is in the group too but is regular-block
// nesting machinery, not a container.)
export function isContainerNode(type: NodeType): boolean {
  return type.isInGroup(CHILD_CONTAINER_GROUP) && type.name !== "blockGroup";
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

export function getChildrenConfig(config: {
  children?: ChildrenConfig;
}): ChildrenConfig | undefined {
  return config.children;
}

export function isContainerType(config: {
  children?: ChildrenConfig;
}): boolean {
  return config.children !== undefined;
}

export function isPlaceableAnywhere(config: {
  placement?: BlockConfig["placement"];
}): boolean {
  return config.placement !== "containerOnly";
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
  const children = getChildrenConfig(node.type.spec.blockConfig ?? {});
  return (
    children !== undefined && resolveChildren(children).boundary === "sealed"
  );
}

export function childrenContentExpression(children: ChildrenConfig): string {
  const resolved = resolveChildren(children);
  return allowTerm(resolved) + quantifier(resolved.min);
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
    // Validation rejects this first; this is a bug-guard, not a user-facing
    // error path.
    throw new Error(
      "Container `allow` permits nothing. This is a bug in BlockNote.",
    );
  }

  return terms.length === 1 ? terms[0] : `(${terms.join(" | ")})`;
}

function quantifier(min: number): string {
  if (min === 0) {
    return "*";
  }
  if (min === 1) {
    return "+";
  }
  return `{${min},}`;
}
