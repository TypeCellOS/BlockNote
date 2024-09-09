import {
  BlockNoteSchema,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useBlockNoteEditor as useBlockNoteEditorCore } from "@blocknote/react";
import { BlockNoteEditor } from "../../core/editor/BlockNoteEditor";

export function useBlockNoteEditor<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema
>(
  _schema?: BlockNoteSchema<BSchema, ISchema, SSchema>
): BlockNoteEditor<BSchema, ISchema, SSchema> {
  return useBlockNoteEditorCore(_schema) as any;
}
