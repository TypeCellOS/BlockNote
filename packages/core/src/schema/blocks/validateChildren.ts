import { resolveChildren } from "./children.js";
import type { BlockConfig, ChildrenConfig } from "./types.js";

type ValidatableConfig = Pick<BlockConfig, "type" | "content"> & {
  children?: ChildrenConfig;
  placement?: BlockConfig["placement"];
  /** From the block's implementation rather than its config. */
  runsBefore?: string[];
};

/**
 * Validates the parts of a container block's declaration that fail silently or
 * catastrophically otherwise. Everything else is left to TypeScript and to
 * ProseMirror, which report malformed configs and unsatisfiable content
 * expressions well enough on their own.
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

    const { blocks, min, containers } = resolveChildren(config.children);

    // `allow: "containers"` compiles to a group the container is itself in, so
    // "must hold a container" includes "must hold a copy of itself", which
    // ProseMirror fills by nesting until the stack overflows.
    if (containers === true && !blocks && min >= 1) {
      fail(
        type,
        'a container that allows only containers (`allow: "containers"`) cannot require any, as it counts as a container itself and would be nested inside itself forever. ' +
          'Use `min: 0`, allow regular blocks as well (`allow: "any"`), or name the container types it accepts.',
      );
    }

    // Every regular block is the same node (`blockContainer`), so naming one
    // here compiles to a valid schema that restricts nothing.
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

    // Container nodes register in a priority band below every regular block
    // (see `containerNodePriority`), so ordering one ahead of a regular block
    // is a silent no-op rather than an error.
    for (const other of config.runsBefore ?? []) {
      // "default" is `sortByDependencies`' reference point, not a block type.
      if (other === "default" || !(other in blockConfigs)) {
        continue;
      }

      if (!isContainerBlockType(other)) {
        throw new Error(
          `Invalid \`runsBefore\` for container block "${type}": it names "${other}", which is a regular block, not a container block. ` +
            "Container block nodes always register below regular ones, so a container can never be ordered before a regular block. " +
            "`runsBefore` on a container can only name other container blocks.",
        );
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
 * A container that requires a child which requires it back can never be
 * created: ProseMirror's `fillBefore` recurses across node types and overflows
 * the stack rather than returning `null`, so it has to be caught statically.
 */
function validateNoCycles(
  blockConfigs: Record<string, ValidatableConfig>,
  isContainerBlockType: (blockType: string) => boolean,
) {
  // A container that allows regular blocks can always be filled with a plain
  // paragraph, so only container-only lists can force recursion.
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
