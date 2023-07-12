import { BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { useEffect } from "react";

export function useEditorSelectionChange<BSchema extends BlockSchema>(
  editor: BlockNoteEditor<BSchema>,
  callback: () => void
) {
  useEffect(() => {
    editor._tiptapEditor.on("selectionUpdate", callback);

    return () => {
      editor._tiptapEditor.off("selectionUpdate", callback);
    };
  }, [callback, editor._tiptapEditor]);
}
