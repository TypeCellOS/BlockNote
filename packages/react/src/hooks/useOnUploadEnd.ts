import { useEffect } from "react";
import { useBlockNoteEditor } from "./useBlockNoteEditor.js";

/**
 * Subscribes to file upload completion events. The callback is invoked whenever
 * a file upload finishes within the editor, and the subscription is
 * automatically cleaned up when the component unmounts.
 *
 * @param callback - Function called when an upload completes. Receives the
 * `blockId` of the block whose upload finished, if available.
 */
export function useOnUploadEnd(callback: (blockId?: string) => void) {
  const editor = useBlockNoteEditor();

  useEffect(() => {
    return editor.onUploadEnd(callback);
  }, [callback, editor]);
}
