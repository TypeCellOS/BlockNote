import { Selection } from "prosemirror-state";
import { CellSelection } from "prosemirror-tables";
import * as z from "zod/v4/core";
import type { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { BlockConfig, PropSchema, PropSchemaFromZod } from "../schema/index.js";
import { Block } from "./index.js";

/**
 * Check if an editor has a certain block type in it's schema
 */
export function editorHasBlockType<BType extends string>(
  editor: BlockNoteEditor<any, any, any>,
  blockType: BType,
): editor is BlockNoteEditor<
  {
    [BT in BType]: BlockConfig<BT, PropSchema<any, any>>;
  },
  any,
  any
> {
  if (!(blockType in editor.schema.blockSpecs)) {
    return false;
  }
  return true;
}

/**
 * Check if an editor has a certain block type in it's schema, and if the members of
 * `zodProps` appear in the block's prop schema with _exactly_ the same type
 */
export function editorHasBlockTypeAndZodProps<
  BType extends string,
  Props extends z.$ZodObject,
>(
  editor: BlockNoteEditor<any, any, any>,
  blockType: BType,
  zodProps: Props,
): editor is BlockNoteEditor<
  {
    [BT in BType]: BlockConfig<BT, PropSchemaFromZod<Props>>;
  },
  any,
  any
> {
  if (!(blockType in editor.schema.blockSpecs)) {
    return false;
  }

  const editorProps: PropSchema =
    editor.schema.blockSpecs[blockType].config.propSchema;

  // make sure every prop in the requested prop appears in the editor schema block props
  return Object.entries(zodProps._zod.def.shape).every(([key, value]) => {
    // we do a JSON Stringify check as Zod doesn't expose
    // equality / assignability checks
    return (
      JSON.stringify(value._zod.def) ===
      JSON.stringify(editorProps._zodSource._zod.def.shape[key]?._zod.def)
    );
  });
}

/**
 * Check if an editor has a certain block type in it's schema,
 * and if `props` would be valid for a block of this type
 */
export function editorHasBlockTypeAndPropsAreValid<
  BType extends string,
  Props extends object,
>(
  editor: BlockNoteEditor<any, any, any>,
  blockType: BType,
  props: Props,
): editor is BlockNoteEditor<
  {
    [BT in BType]: BlockConfig<BT, PropSchema<Props, Props>>;
  },
  any,
  any
> {
  if (!(blockType in editor.schema.blockSpecs)) {
    return false;
  }

  const editorProps: PropSchema =
    editor.schema.blockSpecs[blockType].config.propSchema;

  return z.safeParse(editorProps._zodSource, props).success;
}

/**
 * Check if a block has a certain type, and the members of `zodProps` appear in the block's prop schema with _exactly_ the same type
 */
export function blockHasZodProps<
  BType extends string,
  Props extends z.$ZodObject,
>(
  block: Block<any, any, any>,
  editor: BlockNoteEditor<any, any, any>,
  zodProps: Props,
): block is Block<
  {
    [BT in BType]: BlockConfig<BT, PropSchemaFromZod<Props>>;
  },
  any,
  any
> {
  return editorHasBlockTypeAndZodProps(editor, block.type, zodProps);
}

/**
 * Check if a block is a file block
 */
export function isFileBlock(
  editor: BlockNoteEditor<any, any, any>,
  blockType: string,
) {
  if (!(blockType in editor.schema.blockSpecs)) {
    throw new Error(`Block type ${blockType} not found`);
  }

  return (
    editor.schema.blockSpecs[blockType].implementation.meta?.fileBlockAccept !==
    undefined
  );
}

/**
 * Check if a selection is a table cell selection
 */
export function isTableCellSelection(
  selection: Selection,
): selection is CellSelection {
  return selection instanceof CellSelection;
}
