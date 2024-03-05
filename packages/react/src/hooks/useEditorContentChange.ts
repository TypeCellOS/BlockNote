import type { BlockNoteEditor } from "@blocknote/core";
import { useEffect } from "react";

export function useEditorContentChange(
  editor: BlockNoteEditor<any, any, any>,
  callback: () => void
) {
  useEffect(() => {
    editor._tiptapEditor.on("update", callback);

    return () => {
      editor._tiptapEditor.off("update", callback);
    };
  }, [callback, editor._tiptapEditor]);
}
