import {
  containerChildrenNodeName,
  containerContentNodeName,
  getChildrenConfig,
  isContainerType,
  isPlaceableAnywhere,
  resolveChildren,
} from "./children.js";
import type { ResolvedChildren } from "./children.js";
import type { BlockConfig, ChildrenConfig } from "./types.js";

type ValidatableConfig = Pick<BlockConfig, "type" | "content"> & {
  children?: ChildrenConfig;
  placement?: BlockConfig["placement"];
};

/**
 * Validates the `children` config of every block in a schema, so that
 * misconfigurations are reported as a clear error at schema-creation time
 * instead of as an opaque ProseMirror one (or a stack overflow) much later.
 *
 * @param blockConfigs The configs of every block in the schema, keyed by type.
 */
export function validateChildrenConfigs(
  blockConfigs: Record<string, ValidatableConfig>,
) {
  const isContainerBlockType = (blockType: string) =>
    !!blockConfigs[blockType] && isContainerType(blockConfigs[blockType]);
  const acceptCtx = {
    isContainerBlockType,
    isPlaceableAnywhereType: (blockType: string) =>
      !!blockConfigs[blockType] && isPlaceableAnywhere(blockConfigs[blockType]),
  };

  for (const [type, config] of Object.entries(blockConfigs)) {
    const children = getChildrenConfig(config);

    if (!children) {
      // `placement: "anywhere"` is the documented default for every block, so
      // writing it on a regular block is a harmless restatement. Only
      // `"containerOnly"` is meaningless without `children`.
      if (config.placement === "containerOnly") {
        fail(
          type,
          '`placement: "containerOnly"` only applies to container blocks, but this block does not declare `children`. Regular blocks can always be placed anywhere.',
        );
      }
      continue;
    }

    validateOne(type, config, children, blockConfigs, acceptCtx);
  }

  validateContainerOnlyIsReachable(blockConfigs);
  validateNoCycles(blockConfigs, isContainerBlockType);
}

function fail(type: string, message: string): never {
  throw new Error(
    `Invalid \`children\` config for block "${type}": ${message}`,
  );
}

type AllowAcceptContext = {
  isContainerBlockType: (blockType: string) => boolean;
  isPlaceableAnywhereType: (blockType: string) => boolean;
};

function validateOne(
  type: string,
  config: ValidatableConfig,
  children: ChildrenConfig,
  blockConfigs: Record<string, ValidatableConfig>,
  acceptCtx: AllowAcceptContext,
) {
  // A container may have its own content: it then becomes a node holding a
  // content node and a children node. A table can't. Its content is already
  // a node tree of its own, with nowhere to put the children node.
  if (config.content === "table") {
    fail(
      type,
      '`children` cannot be combined with `content: "table"`. A table block\'s content is already a structure of its own.',
    );
  }

  if (config.content !== "none") {
    // The content & children nodes are generated from the block type, so a
    // block type that happens to have the generated name would silently
    // overwrite one of them.
    for (const generated of [
      containerContentNodeName(type),
      containerChildrenNodeName(type),
    ]) {
      if (generated in blockConfigs) {
        fail(
          type,
          `it has its own content as well as \`children\`, so it generates a node named "${generated}", which collides with the block type of the same name. Rename one of the two.`,
        );
      }
    }
  }

  // Mirror the type-level contract for JS consumers: `allow` is required, and
  // takes exactly the four forms. Widened to `unknown` because the type
  // narrowing would otherwise leave `never` for the message.
  const allow: unknown = children.allow;
  if (allow === undefined) {
    fail(
      type,
      '`allow` is required. Use `children: { allow: "any" }` for a container that accepts any block.',
    );
  }
  if (
    !Array.isArray(allow) &&
    allow !== "any" &&
    allow !== "blocks" &&
    allow !== "containers"
  ) {
    fail(
      type,
      `\`allow\` must be "any", "blocks", "containers" or an array of container block types, but is ${JSON.stringify(allow)}.`,
    );
  }

  const boundary: string | undefined = children.boundary;
  if (
    boundary !== undefined &&
    boundary !== "open" &&
    boundary !== "isolated" &&
    boundary !== "sealed"
  ) {
    fail(
      type,
      `\`boundary\` must be "open", "isolated" or "sealed", but is "${boundary}".`,
    );
  }

  const resolved = resolveChildren(children);

  if (!Number.isInteger(resolved.min) || resolved.min < 0) {
    fail(
      type,
      `minimum child count must be a non-negative integer, but is ${resolved.min}.`,
    );
  }

  validateAllow(type, resolved, blockConfigs, acceptCtx);
  validateDefault(type, resolved, blockConfigs, acceptCtx);
}

function validateAllow(
  type: string,
  resolved: ResolvedChildren,
  blockConfigs: Record<string, ValidatableConfig>,
  { isContainerBlockType, isPlaceableAnywhereType }: AllowAcceptContext,
) {
  if (resolved.containers !== true) {
    for (const allowed of resolved.containers) {
      if (!(allowed in blockConfigs)) {
        fail(
          type,
          `\`allow\` contains "${allowed}", which is not a block type in this schema.`,
        );
      }
      // An `allow` array is exact by construction: each named type is its own
      // ProseMirror node. Every *regular* block, by contrast, is the same node
      // (`blockContainer`), so naming one here would promise a restriction the
      // schema cannot keep.
      if (!isContainerBlockType(allowed)) {
        fail(
          type,
          `\`allow\` contains "${allowed}", which is a regular block, not a container block. ` +
            "Restricting which regular block types a container accepts is not yet supported, as every regular block is the same ProseMirror node. " +
            'Use `allow: "blocks"` to accept all regular blocks, or name only container block types.',
        );
      }
    }
  }

  if (
    !resolved.blocks &&
    resolved.containers !== true &&
    resolved.containers.length === 0
  ) {
    fail(
      type,
      "`allow` permits nothing. A container must accept at least one block or container type; drop `children` entirely for a block that holds none.",
    );
  }

  if (!resolved.blocks && resolved.containers === true) {
    // The wildcard compiles to the containers placeable anywhere, so only
    // those make the container fillable. `containerOnly` blocks are never
    // included.
    const hasContainer = Object.keys(blockConfigs).some(
      (blockType) =>
        isContainerBlockType(blockType) &&
        blockType !== type &&
        isPlaceableAnywhereType(blockType),
    );
    if (!hasContainer) {
      fail(
        type,
        "`allow` permits only container blocks, but this schema has no other container block types placeable anywhere. " +
          'The `"containers"` wildcard never includes `placement: "containerOnly"` blocks. Name those explicitly in an `allow` array.',
      );
    }
  }
}

function validateDefault(
  type: string,
  resolved: ResolvedChildren,
  blockConfigs: Record<string, ValidatableConfig>,
  acceptCtx: AllowAcceptContext,
) {
  const { default: defaultChildren, min } = resolved;
  if (!defaultChildren) {
    return;
  }

  if (defaultChildren.length < min) {
    fail(
      type,
      `\`default\` has ${defaultChildren.length} block(s), fewer than the ${min} required.`,
    );
  }

  for (const child of defaultChildren) {
    const childType = child.type ?? "paragraph";
    if (!(childType in blockConfigs)) {
      fail(
        type,
        `\`default\` contains a block of type "${childType}", which is not a block type in this schema.`,
      );
    }

    if (!allowAccepts(resolved, childType, acceptCtx)) {
      fail(
        type,
        `\`default\` contains a block of type "${childType}", which is not permitted.`,
      );
    }
  }
}

/**
 * Whether a container's `allow` accepts a block type. Matches what the schema
 * enforces: the only lever for regular blocks is whether `blockContainer` is
 * in the content expression, and the container wildcards compile to the
 * containers placeable anywhere, so a `placement: "containerOnly"` block is
 * only accepted where it is named explicitly.
 */
function allowAccepts(
  resolved: ResolvedChildren,
  blockType: string,
  ctx: AllowAcceptContext,
): boolean {
  if (ctx.isContainerBlockType(blockType)) {
    return resolved.containers === true
      ? ctx.isPlaceableAnywhereType(blockType)
      : resolved.containers.includes(blockType);
  }
  return resolved.blocks;
}

/**
 * Container nodes register in a priority band strictly below `blockContainer`
 * (see `containerNodePriority`), which is below every regular block. So a
 * container's `runsBefore` can only order it against other containers. Naming
 * a regular block there promises an ordering the schema cannot produce.
 *
 * @param blockConfigs The configs of every block in the schema, keyed by type.
 * @param runsBefore The `runsBefore` each block's implementation declares.
 */
export function validateContainerRunsBefore(
  blockConfigs: Record<string, ValidatableConfig>,
  runsBefore: Record<string, readonly string[] | undefined>,
) {
  for (const [type, config] of Object.entries(blockConfigs)) {
    if (!isContainerType(config)) {
      continue;
    }

    for (const other of runsBefore[type] ?? []) {
      // "default" is `sortByDependencies`' reference point rather than a
      // block type. A type that isn't in the schema is not this check's
      // concern.
      if (other === "default" || !(other in blockConfigs)) {
        continue;
      }
      if (!isContainerType(blockConfigs[other])) {
        throw new Error(
          `Invalid \`runsBefore\` for container block "${type}": it names "${other}", which is a regular block, not a container block. ` +
            "Container block nodes always register below regular ones, so a container can never be ordered before a regular block. " +
            "`runsBefore` on a container can only name other container blocks.",
        );
      }
    }
  }
}

/**
 * A `placement: "containerOnly"` block that no container accepts could never
 * be inserted anywhere, which is always a mistake rather than a choice.
 *
 * Only explicit `allow` arrays count: the container wildcards compile to the
 * containers placeable anywhere, so they never accept a `containerOnly`
 * block. Otherwise deliberately conservative. Proving that the block is
 * reachable from a block placeable at the root is full graph reachability,
 * and this check only exists to catch typos.
 */
function validateContainerOnlyIsReachable(
  blockConfigs: Record<string, ValidatableConfig>,
) {
  const accepted = new Set<string>();
  for (const config of Object.values(blockConfigs)) {
    const children = getChildrenConfig(config);
    if (!children) {
      continue;
    }
    const { containers } = resolveChildren(children);
    if (containers === true) {
      continue;
    }
    for (const allowed of containers) {
      accepted.add(allowed);
    }
  }

  for (const [type, config] of Object.entries(blockConfigs)) {
    if (!isPlaceableAnywhere(config) && !accepted.has(type)) {
      fail(
        type,
        `it declares \`placement: "containerOnly"\`, but no container's \`children.allow\` array includes it, so it could never be inserted.`,
      );
    }
  }
}

/**
 * A container that requires a child which in turn requires it back can never
 * be created: ProseMirror's `fillBefore` recurses across node types and
 * overflows the stack rather than returning `null`. So this has to be caught
 * statically, before the schema is built.
 */
function validateNoCycles(
  blockConfigs: Record<string, ValidatableConfig>,
  isContainerBlockType: (blockType: string) => boolean,
) {
  // A container that allows regular blocks can always be filled with a plain
  // paragraph, so it never forces recursion. Only container-only lists do.
  const requiredContainers = (type: string): string[] => {
    const children = getChildrenConfig(blockConfigs[type]);
    if (!children) {
      return [];
    }
    const resolved = resolveChildren(children);
    return resolved.min >= 1 && !resolved.blocks && resolved.containers !== true
      ? resolved.containers.filter(isContainerBlockType)
      : [];
  };

  const state = new Map<string, "visiting" | "done">();

  const visit = (type: string, path: string[]) => {
    const seen = state.get(type);
    if (seen === "done") {
      return;
    }
    if (seen === "visiting") {
      fail(
        type,
        `it requires a child that requires it back (${[...path, type].join(" -> ")}), so it could never be created. Allow regular blocks in one of the containers to break the cycle.`,
      );
    }

    state.set(type, "visiting");
    for (const next of requiredContainers(type)) {
      visit(next, [...path, type]);
    }
    state.set(type, "done");
  };

  for (const type of Object.keys(blockConfigs)) {
    visit(type, []);
  }
}
