import { CellSelection } from "prosemirror-tables";
import type { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { BlockConfig, PropSchema, PropSpec } from "../schema/index.js";
import { Block } from "./defaultBlocks.js";
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
                values?: any[];
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

export function isTableCellSelection(
  selection: Selection,
): selection is CellSelection {
  return selection instanceof CellSelection;
}
