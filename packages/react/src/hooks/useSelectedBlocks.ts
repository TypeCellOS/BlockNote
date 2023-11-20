import { Block, BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { StyleSchema } from "@blocknote/core/src/extensions/Blocks/api/styles";
import { useState } from "react";
import { useEditorChange } from "./useEditorChange";

export function useSelectedBlocks<
  BSchema extends BlockSchema,
  SSchema extends StyleSchema
>(editor: BlockNoteEditor<BSchema, SSchema>) {
  const [selectedBlocks, setSelectedBlocks] = useState<
    Block<BSchema, SSchema>[]
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
