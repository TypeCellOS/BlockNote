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
        '`container: true` is only for blocks without content (`content: "none"`). A container block holds only child blocks, no content of its own.',
      );
    }
    if (config.placeable === "namedOnly" && config.container !== true) {
      fail(
        type,
        '`placeable: "namedOnly"` is only for container blocks (`container: true`). Only a container block can be limited to the blocks that name it in `children.allow`.',
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
      dissolve,
    } = config.children as {
      allow?: ChildrenAllow;
      min?: number;
      exclude?: readonly string[];
      dissolve?: boolean;
    };

    // The child blocks of a block that isn't a container share one untyped
    // group, which can't enforce types or counts.
    if (config.container !== true) {
      if (
        allow !== "blocks" ||
        min !== undefined ||
        exclude !== undefined ||
        dissolve !== undefined
      ) {
        fail(
          type,
          'restricting child types, a minimum count or `dissolve` requires `container: true`. Other blocks can always have any child blocks (`{ allow: "blocks" }`).',
        );
      }
      continue;
    }

    // A container that accepts any blocks always holds at least one, and
    // dissolves when it loses it. A minimum, and whether the container
    // dissolves, only mean something for a set of named container types (two
    // columns, one tab). A key can move the last block out of a container
    // that accepts any blocks, so one that does not dissolve could never be
    // removed with the keyboard.
    if (allow === "blocks" && (min !== undefined || dissolve !== undefined)) {
      fail(
        type,
        `\`children.${min !== undefined ? "min" : "dissolve"}\` needs an \`allow\` list. A container that accepts any blocks always holds at least one child, and dissolves when its last child is removed.`,
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
            `\`exclude\` contains "${excluded}", which is not a container block. ` +
              "Only container blocks (`container: true`) can be excluded.",
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
            `\`allow\` contains "${allowed}", which is not a container block. ` +
              "An `allow` list can name only container blocks (`container: true`); naming other blocks is not supported yet. " +
              'Use `allow: "blocks"` to accept all other blocks.',
          );
        }
      }
    }
  }

  // A `namedOnly` block can only be a child of a block that names it in
  // `children.allow`. Without such a block, the editor cannot insert it.
  const named = new Set(
    Object.values(blockSpecs).flatMap(({ config }) =>
      config.children?.allow && config.children.allow !== "blocks"
        ? config.children.allow
        : [],
    ),
  );
  for (const [type, { config }] of Object.entries(blockSpecs)) {
    if (config.placeable === "namedOnly" && !named.has(type)) {
      fail(
        type,
        '`placeable: "namedOnly"` limits this block to the blocks that name it in `children.allow`, but no block names it. Name it in the `allow` list of a container block.',
      );
    }
  }
}

function fail(type: string, message: string): never {
  throw new Error(`Invalid config for block "${type}": ${message}`);
}
