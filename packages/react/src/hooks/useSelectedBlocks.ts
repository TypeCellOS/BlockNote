import { Block, BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { useState } from "react";
import { useEditorChange } from "./useEditorChange";

export function useSelectedBlocks<BSchema extends BlockSchema>(
  editor: BlockNoteEditor<BSchema>
) {
  const [selectedBlocks, setSelectedBlocks] = useState<Block<BSchema>[]>(
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
