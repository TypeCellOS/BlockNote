import { isContainerConfig } from "./children.js";
import type { BlockConfig } from "./types.js";

/** Reject declarations ProseMirror would accept with different semantics. */
export function validateChildrenConfigs(
  blockSpecs: Record<
    string,
    { config: Pick<BlockConfig, "content" | "placeable" | "children"> }
  >,
) {
  for (const [type, { config }] of Object.entries(blockSpecs)) {
    if (config.placeable === "namedOnly" && !isContainerConfig(config)) {
      fail(
        type,
        '`placeable: "namedOnly"` requires a container node; regular blocks share the same wrapper and cannot restrict their placement.',
      );
    }
    if (!config.children) {
      continue;
    }

    const { allow, min } = config.children;
    if (config.content === "table") {
      fail(type, "`children` is not supported on table blocks.");
    }

    // Text blocks share an optional child group, so only pure containers
    // can restrict their children's types or minimum count.
    if (
      config.content !== "none" &&
      (allow !== "blocks" || min !== undefined)
    ) {
      fail(
        type,
        'blocks with inline or plain content support `children: { allow: "blocks" }` only. Child-type and minimum-count restrictions require a pure container.',
      );
    }

    // Every regular block is the same node (`blockContainer`), so naming one
    // here compiles to a valid schema that restricts nothing.
    if (allow !== "blocks") {
      for (const allowed of allow) {
        if (!Object.prototype.hasOwnProperty.call(blockSpecs, allowed)) {
          fail(
            type,
            `\`allow\` contains "${allowed}", which is not a configured block type.`,
          );
        }
        if (!isContainerConfig(blockSpecs[allowed].config)) {
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
