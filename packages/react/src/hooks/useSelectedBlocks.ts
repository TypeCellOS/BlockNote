import {
  Block,
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useState } from "react";
import { useEditorChange } from "./useEditorChange";

export function useSelectedBlocks<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(editor: BlockNoteEditor<BSchema, ISchema, SSchema>) {
  const [selectedBlocks, setSelectedBlocks] = useState<
    Block<BSchema, ISchema, SSchema>[]
  >(
    () =>
      editor.getSelection()?.blocks || [editor.getTextCursorPosition().block]
  );

  useEditorChange(editor, () =>
    setSelectedBlocks(
      editor.getSelection()?.blocks || [editor.getTextCursorPosition().block]
    )
  );

  return selectedBlocks;
}
