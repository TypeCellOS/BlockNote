import { useEffect } from "react";
import { useBlockNoteEditor } from "./useBlockNoteEditor.js";

/**
 * Subscribes to file upload start events. The callback is invoked whenever a
 * file upload begins within the editor, and the subscription is automatically
 * cleaned up when the component unmounts.
 *
 * @param callback - Function called when an upload starts. Receives the
 * `blockId` of the block where the upload was initiated, if available.
 */
export function useOnUploadStart(callback: (blockId?: string) => void) {
  const editor = useBlockNoteEditor();

  useEffect(() => {
    return editor.onUploadStart(callback);
  }, [callback, editor]);
}
