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

export function editorHasBlockWithType<BType extends string>(
  editor: BlockNoteEditor<any, any, any>,
  blockType: BType,
): editor is BlockNoteEditor<
  {
    [BT in BType]: BlockConfig<
      BT,
      {
        [PN in string]: PropSpec<boolean | number | string>;
      }
    >;
  },
  any,
  any
> {
  if (!(blockType in editor.schema.blockSpecs)) {
    return false;
  }

  if (editor.schema.blockSpecs[blockType].config.type !== blockType) {
    return false;
  }

  return true;
}

export function editorHasBlockWithTypeAndProps<
  BType extends string,
  PSchema extends PropSchema,
>(
  editor: BlockNoteEditor<any, any, any>,
  blockType: BType,
  propSchema: PSchema,
): editor is BlockNoteEditor<
  {
    [BT in BType]: BlockConfig<BT, PSchema>;
  },
  any,
  any
> {
  if (!editorHasBlockWithType(editor, blockType)) {
    return false;
  }

  for (const [propName, propSpec] of Object.entries(propSchema)) {
    if (!(propName in editor.schema.blockSpecs[blockType].config.propSchema)) {
      return false;
    }

    if (
      editor.schema.blockSpecs[blockType].config.propSchema[propName]
        .default !== propSpec.default
    ) {
      return false;
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

    if (
      editor.schema.blockSpecs[blockType].config.propSchema[propName]
        .default === undefined &&
      propSpec.default === undefined
    ) {
      if (
        editor.schema.blockSpecs[blockType].config.propSchema[propName].type !==
        propSpec.type
      ) {
        return false;
      }
    }
  }

  return true;
}

export function blockHasType<BType extends string>(
  block: Block<any, any, any>,
  editor: BlockNoteEditor<any, any, any>,
  blockType: BType,
): block is Block<
  {
    [BT in string]: BlockConfig<
      BT,
      {
        [PN in string]: PropSpec<boolean | number | string>;
      }
    >;
  },
  any,
  any
> {
  return editorHasBlockWithType(editor, blockType) && block.type === blockType;
}

export function blockHasTypeAndProps<
  BType extends string,
  PSchema extends PropSchema,
>(
  block: Block<any, any, any>,
  editor: BlockNoteEditor<any, any, any>,
  blockType: BType,
  propSchema: PSchema,
): block is Block<
  {
    [BT in string]: BlockConfig<BT, PSchema>;
  },
  any,
  any
> {
  return (
    editorHasBlockWithTypeAndProps(editor, blockType, propSchema) &&
    block.type === blockType
  );
}

// TODO: Only used in the emoji picker - is it even needed? If so, needs to be
// changed to be like the block type guards.
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
