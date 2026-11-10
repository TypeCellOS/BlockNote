import type { BlockNoteEditor } from "@blocknote/core";

import type { ContentKind } from "../../model.js";

/**
 * The child rule of a layout block (a block with `layoutOnly: true` in its
 * config, for example a column list or a column).
 */
export type LayoutRule = {
  /** The minimum number of children. */
  minChildren: number;
  /**
   * True if the block can only be a child of its layout parent, for example a
   * column (`placeable: "namedOnly"`).
   */
  namedOnly: boolean;
  /**
   * True if the block with too few children becomes the blocks in it, for
   * example a column list with one column (`children.dissolve`).
   */
  dissolves: boolean;
};

/** The rules of the block configs of a schema that the lens uses (the props: see `props.ts`). */
export type SchemaRules = {
  /** The type of content of a block type. Throws for a type that is not in the schema. */
  contentKindOf: (type: string) => ContentKind;
  /** The child rule of a layout block type, or `undefined` for other types. */
  layoutRuleOf: (type: string) => LayoutRule | undefined;
  /**
   * Returns true if a block of the type `parent` (`undefined` for the top
   * level) can have a child of the type `child`. A block placeable
   * "namedOnly" (a column) is only in a parent that allows its type by name.
   */
  canContain: (parent: string | undefined, child: string) => boolean;
};

export function schemaRulesOf(
  editor: BlockNoteEditor<any, any, any>,
): SchemaRules {
  const configs = editor.schema.blockSchema;
  return {
    contentKindOf(type) {
      const config = configs[type];
      if (config === undefined) {
        throw new Error(`Block type "${type}" is not in the editor's schema`);
      }
      return config.content;
    },
    layoutRuleOf(type) {
      const config = configs[type];
      if (config?.layoutOnly !== true) {
        return undefined;
      }
      const children = config.children;
      return {
        minChildren:
          children !== undefined && "min" in children ? (children.min ?? 1) : 1,
        namedOnly: config.placeable === "namedOnly",
        dissolves: !(
          children !== undefined &&
          "dissolve" in children &&
          children.dissolve === false
        ),
      };
    },
    canContain(parent, child) {
      const rule = parent === undefined ? undefined : configs[parent]?.children;
      if (configs[child]?.placeable === "namedOnly") {
        return (
          rule !== undefined &&
          Array.isArray(rule.allow) &&
          rule.allow.includes(child)
        );
      }
      if (rule === undefined) {
        return true;
      }
      if (Array.isArray(rule.allow)) {
        return rule.allow.includes(child);
      }
      return !("exclude" in rule && rule.exclude?.includes(child));
    },
  };
}
