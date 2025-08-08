import { CellSelection } from "prosemirror-tables";
import type { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import {
  BlockConfig,
  BlockSchema,
  PropSchema,
  PropSpec,
  StyleSchema,
} from "../schema/index.js";
import {
  Block,
  DefaultInlineContentSchema,
  defaultInlineContentSchema,
} from "./defaultBlocks.js";
import { Selection } from "prosemirror-state";

export function editorHasBlockWithType<
  BType extends string,
  Props extends
    | PropSchema
    | Record<string, "boolean" | "number" | "string">
    | undefined = undefined,
>(
  editor: BlockNoteEditor<any, any, any>,
  blockType: BType,
  props?: Props,
): editor is BlockNoteEditor<
  {
    [BT in BType]: Props extends PropSchema
      ? BlockConfig<BT, Props>
      : Props extends Record<string, "boolean" | "number" | "string">
        ? BlockConfig<
            BT,
            {
              [PN in keyof Props]: {
                default: undefined;
                type: Props[PN];
              };
            }
          >
        : BlockConfig<BT, PropSchema>;
  },
  any,
  any
> {
  if (!(blockType in editor.schema.blockSpecs)) {
    return false;
  }

  if (!props) {
    return true;
  }

  for (const [propName, propSpec] of Object.entries(props)) {
    if (!(propName in editor.schema.blockSpecs[blockType].config.propSchema)) {
      return false;
    }

    if (typeof propSpec === "string") {
      if (
        editor.schema.blockSpecs[blockType].config.propSchema[propName]
          .default &&
        typeof editor.schema.blockSpecs[blockType].config.propSchema[propName]
          .default !== propSpec
      ) {
        return false;
      }

      if (
        editor.schema.blockSpecs[blockType].config.propSchema[propName].type &&
        editor.schema.blockSpecs[blockType].config.propSchema[propName].type !==
          propSpec
      ) {
        return false;
      }
    } else {
      if (
        editor.schema.blockSpecs[blockType].config.propSchema[propName]
          .default !== propSpec.default
      ) {
        return false;
      }

      if (
        editor.schema.blockSpecs[blockType].config.propSchema[propName]
          .default === undefined &&
        propSpec.default === undefined
      ) {
        if (
          editor.schema.blockSpecs[blockType].config.propSchema[propName]
            .type !== propSpec.type
        ) {
          return false;
        }
      }

      if (
        typeof editor.schema.blockSpecs[blockType].config.propSchema[propName]
          .values !== typeof propSpec.values
      ) {
        return false;
      }

      if (
        typeof editor.schema.blockSpecs[blockType].config.propSchema[propName]
          .values === "object" &&
        typeof propSpec.values === "object"
      ) {
        if (
          editor.schema.blockSpecs[blockType].config.propSchema[propName].values
            .length !== propSpec.values.length
        ) {
          return false;
        }

        for (
          let i = 0;
          i <
          editor.schema.blockSpecs[blockType].config.propSchema[propName].values
            .length;
          i++
        ) {
          if (
            editor.schema.blockSpecs[blockType].config.propSchema[propName]
              .values[i] !== propSpec.values[i]
          ) {
            return false;
          }
        }
      }
    }
  }

  return true;
}

export function blockHasType<
  BType extends string,
  Props extends
    | PropSchema
    | Record<string, "boolean" | "number" | "string">
    | undefined = undefined,
>(
  block: Block<any, any, any>,
  editor: BlockNoteEditor<any, any, any>,
  blockType: BType,
  props?: Props,
): block is Block<
  {
    [BT in BType]: Props extends PropSchema
      ? BlockConfig<BT, Props>
      : Props extends Record<string, "boolean" | "number" | "string">
        ? BlockConfig<
            BT,
            {
              [PN in keyof Props]: PropSpec<
                Props[PN] extends "boolean"
                  ? boolean
                  : Props[PN] extends "number"
                    ? number
                    : Props[PN] extends "string"
                      ? string
                      : never
              >;
            }
          >
        : BlockConfig<BT, PropSchema>;
  },
  any,
  any
> {
  return (
    editorHasBlockWithType(editor, blockType, props) && block.type === blockType
  );
}

// TODO: Only used once in the emoji picker - is it even needed? If so, should
// be changed to be like the block type guards.
export function checkDefaultInlineContentTypeInSchema<
  InlineContentType extends keyof DefaultInlineContentSchema,
  B extends BlockSchema,
  S extends StyleSchema,
>(
  inlineContentType: InlineContentType,
  editor: BlockNoteEditor<B, any, S>,
): editor is BlockNoteEditor<
  B,
  { [K in InlineContentType]: DefaultInlineContentSchema[InlineContentType] },
  S
> {
  return (
    inlineContentType in editor.schema.inlineContentSchema &&
    editor.schema.inlineContentSchema[inlineContentType] ===
      defaultInlineContentSchema[inlineContentType]
  );
}

export function isTableCellSelection(
  selection: Selection,
): selection is CellSelection {
  return selection instanceof CellSelection;
}
