import {
  BlockNoteEditor,
  BlockNoteSchema,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

import { useBlockNoteContext } from "../editor/BlockNoteContext.js";

/**
 * Get the BlockNoteEditor instance from the nearest BlockNoteContext provider
 * @param _schema: optional, pass in the schema to return type-safe BlockNoteEditor if you're using a custom schema
 */
export function useBlockNoteEditor<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema,
>(
  _schema?: BlockNoteSchema<BSchema, ISchema, SSchema>,
): BlockNoteEditor<BSchema, ISchema, SSchema> {
  const context = useBlockNoteContext(_schema);

  if (!context?.editor) {
    throw new Error(
      "useBlockNoteEditor was called outside of a BlockNoteContext provider or BlockNoteView component",
    );
  }

  return context.editor;
}
