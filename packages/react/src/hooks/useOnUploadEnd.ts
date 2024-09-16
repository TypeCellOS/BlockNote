import { useBlockNoteEditor } from "./useBlockNoteEditor";
import { useEffect } from "react";

export function useOnUploadEnd(callback: (blockId?: string) => void) {
  const editor = useBlockNoteEditor();

  useEffect(() => {
    return editor.onUploadEnd(callback);
  }, [callback, editor]);
}
