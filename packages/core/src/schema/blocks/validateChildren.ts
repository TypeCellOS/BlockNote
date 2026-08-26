import { resolveChildren } from "./children.js";
import type { BlockConfig, ChildrenConfig } from "./types.js";

type ValidatableConfig = Pick<BlockConfig, "type" | "content"> & {
  children?: ChildrenConfig;
  placement?: BlockConfig["placement"];
};

/**
 * Validates the parts of a `children` config that nothing else catches.
 *
 * Deliberately narrow: TypeScript already rejects malformed configs at compile
 * time, and ProseMirror already reports unknown types, unsatisfiable content
 * expressions and unfillable containers with usable messages of its own. Only
 * the three cases below fail silently or catastrophically without help.
 *
 * @param blockConfigs The configs of every block in the schema, keyed by type.
 */
export function validateChildrenConfigs(
  blockConfigs: Record<string, ValidatableConfig>,
) {
  const isContainerBlockType = (blockType: string) =>
    blockConfigs[blockType]?.children !== undefined;

  for (const [type, config] of Object.entries(blockConfigs)) {
    if (!config.children) {
      continue;
    }

    const { min, max, containers } = resolveChildren(config.children);

    // ProseMirror's content-expression parser never compares the two, so an
    // inverted range is silently read as "exactly `min`".
    if (max !== undefined && max < min) {
      fail(
        type,
        `maximum child count (${max}) must be greater than or equal to the minimum (${min}).`,
      );
    }

    // An `allow` array is exact by construction: each named type is its own
    // ProseMirror node. Every *regular* block, by contrast, is the same node
    // (`blockContainer`), so naming one here compiles to a valid schema that
    // quietly fails to restrict anything.
    if (containers !== true) {
      for (const allowed of containers) {
        if (allowed in blockConfigs && !isContainerBlockType(allowed)) {
          fail(
            type,
            `\`allow\` contains "${allowed}", which is a regular block, not a container block. ` +
              "Restricting which regular block types a container accepts is not yet supported, as every regular block is the same ProseMirror node. " +
              'Use `allow: "blocks"` to accept all regular blocks, or name only container block types.',
          );
        }
      }
    }
  }

  validateNoCycles(blockConfigs, isContainerBlockType);
}

function fail(type: string, message: string): never {
  throw new Error(
    `Invalid \`children\` config for block "${type}": ${message}`,
  );
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
    const children = blockConfigs[type].children;
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
