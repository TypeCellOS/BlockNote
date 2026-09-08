import { isContainerConfig } from "./children.js";
import type { BlockConfig, ChildrenConfig } from "./types.js";

type ValidatableConfig = Pick<BlockConfig, "type" | "content" | "placeable"> & {
  children?: ChildrenConfig;
};

/** Reject declarations ProseMirror would accept with different semantics. */
export function validateChildrenConfigs(
  blockConfigs: Record<string, ValidatableConfig>,
) {
  for (const [type, config] of Object.entries(blockConfigs)) {
    if (config.placeable === "namedOnly" && !isContainerConfig(config)) {
      fail(
        type,
        '`placeable: "namedOnly"` requires a container node; regular blocks share the same wrapper and cannot restrict their placement.',
      );
    }
    if (!config.children) {
      continue;
    }

    const { allow } = config.children;

    // Titled bodies use the ordinary optional blockGroup. They can own that
    // body, but cannot specialize its content expression per title type.
    if (
      config.content === "inline" &&
      (config.children.allow !== "blocks" || config.children.min !== undefined)
    ) {
      fail(
        type,
        'titled blocks support `children: { allow: "blocks" }` only. Child-type and minimum-count restrictions require a pure container.',
      );
    }

    if (config.content !== "none" && config.content !== "inline") {
      fail(
        type,
        `declares \`content: "${config.content}"\` alongside \`children\`. A block with \`children\` either has no content of its own (\`content: "none"\`, a container) or an inline title with a body (\`content: "inline"\`, a titled block). Set \`content: "none"\` or \`"inline"\`, or drop \`children\`.`,
      );
    }

    // Every regular block is the same node (`blockContainer`), so naming one
    // here compiles to a valid schema that restricts nothing.
    if (allow !== "blocks") {
      for (const allowed of allow) {
        if (
          allowed in blockConfigs &&
          !isContainerConfig(blockConfigs[allowed])
        ) {
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
}

function fail(type: string, message: string): never {
  throw new Error(
    `Invalid \`children\` config for block "${type}": ${message}`,
  );
}
