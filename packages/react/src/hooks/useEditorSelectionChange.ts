import type { BlockNoteEditor } from "@blocknote/core";
import { useEffect } from "react";

export function useEditorSelectionChange(
  editor: BlockNoteEditor<any, any, any>,
  callback: () => void
) {
  useEffect(() => {
    editor._tiptapEditor.on("selectionUpdate", callback);

    return () => {
      editor._tiptapEditor.off("selectionUpdate", callback);
    };
  }, [callback, editor._tiptapEditor]);
}
