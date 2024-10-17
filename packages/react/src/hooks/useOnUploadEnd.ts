import { useEffect } from "react";
import { useBlockNoteEditor } from "./useBlockNoteEditor.js";

export function useOnUploadEnd(callback: (blockId?: string) => void) {
  const editor = useBlockNoteEditor();

  useEffect(() => {
    return editor.onUploadEnd(callback);
  }, [callback, editor]);
}
