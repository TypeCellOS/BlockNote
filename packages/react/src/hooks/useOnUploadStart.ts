import { useEffect } from "react";
import { useBlockNoteEditor } from "./useBlockNoteEditor.js";

export function useOnUploadStart(callback: (blockId?: string) => void) {
  const editor = useBlockNoteEditor();

  useEffect(() => {
    return editor.onUploadStart(callback);
  }, [callback, editor]);
}
