import { useBlockNoteEditor } from "./useBlockNoteEditor";
import { useEffect } from "react";

export function useOnUploadStart(callback: (blockId?: string) => void) {
  const editor = useBlockNoteEditor();

  useEffect(() => {
    return editor.onUploadStart(callback);
  }, [callback, editor]);
}
