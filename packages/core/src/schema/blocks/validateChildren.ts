import type { BlockConfig, ChildrenAllow } from "./types.js";

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
    if (config.placeable === "namedOnly" && config.container !== true) {
      fail(
        type,
        '`placeable: "namedOnly"` requires a container node; regular blocks share the same wrapper and cannot restrict their placement.',
      );
    }
    if (!config.children) {
      continue;
    }

    // Typed loosely: a JS caller can put anything here.
    const {
      allow = "blocks",
      min,
      exclude,
    } = config.children as {
      allow?: ChildrenAllow;
      min?: number;
      exclude?: readonly string[];
    };

    // The child blocks of a block that isn't a container share one untyped
    // group, which can't enforce types or counts.
    if (config.container !== true) {
      if (allow !== "blocks" || min !== undefined || exclude !== undefined) {
        fail(
          type,
          'restricting child types or a minimum count requires `container: true`. Other blocks can always have any child blocks (`{ allow: "blocks" }`).',
        );
      }
      continue;
    }

    // A container that accepts any blocks always holds at least one, and
    // dissolves when it loses it. A minimum only means something for a set
    // of named container types (two columns, one tab).
    if (allow === "blocks" && min !== undefined) {
      fail(
        type,
        "`children.min` needs an `allow` list. A container that accepts any blocks always holds at least one child, and dissolves when its last child is removed.",
      );
    }

    if (exclude !== undefined) {
      if (allow !== "blocks") {
        fail(
          type,
          "`children.exclude` is only for a container that accepts any blocks. An `allow` list already names exactly what the container holds.",
        );
      }
      for (const excluded of exclude) {
        if (!Object.prototype.hasOwnProperty.call(blockSpecs, excluded)) {
          fail(
            type,
            `\`exclude\` contains "${excluded}", which is not a configured block type.`,
          );
        }
        const { config: excludedConfig } = blockSpecs[excluded];
        if (excludedConfig.container !== true) {
          fail(
            type,
            `\`exclude\` contains "${excluded}", which is a regular block, not a container block. ` +
              "Every regular block is the same ProseMirror node, so one can't be excluded on its own.",
          );
        }
        if (excludedConfig.placeable === "namedOnly") {
          fail(
            type,
            `\`exclude\` contains "${excluded}", which is \`placeable: "namedOnly"\` and never a child of a container that accepts any blocks.`,
          );
        }
      }
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
        if (blockSpecs[allowed].config.container !== true) {
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
