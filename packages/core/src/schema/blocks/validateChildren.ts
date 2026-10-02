import { isContainerConfig } from "./children.js";
import type { BlockConfig, ChildrenConfig } from "./types.js";

/** Reject declarations ProseMirror would accept with different semantics. */
export function validateChildrenConfigs(
  blockSpecs: Record<
    string,
    {
      config: Pick<
        BlockConfig,
        "content" | "placeable" | "container" | "children"
      >;
    }
  >,
) {
  for (const [type, { config }] of Object.entries(blockSpecs)) {
    if (config.container !== undefined && config.content !== "none") {
      fail(
        type,
        '`container: true` is only for blocks without content (`content: "none"`): a container\'s own node holds nothing but its child blocks.',
      );
    }
    if (config.placeable === "namedOnly" && !isContainerConfig(config)) {
      fail(
        type,
        '`placeable: "namedOnly"` requires a container node; regular blocks share the same wrapper and cannot restrict their placement.',
      );
    }
    if (!config.children) {
      continue;
    }

    // Typed loosely: a JS caller can put anything here.
    const { allow = "blocks", min } = config.children as ChildrenConfig;

    // The child blocks of a block that isn't a container share one untyped
    // group, which can't enforce types or counts.
    if (!isContainerConfig(config)) {
      if (allow !== "blocks" || min !== undefined) {
        fail(
          type,
          'restricting child types or a minimum count requires `container: true`. Other blocks can always have any child blocks (`{ allow: "blocks" }`).',
        );
      }
      continue;
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
