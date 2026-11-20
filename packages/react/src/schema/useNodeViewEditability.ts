import type { BlockNoteEditor } from "@blocknote/core";
import { useCallback, useSyncExternalStore } from "react";

/** Invalidate live React node views when the editor's editability changes. */
export function useNodeViewEditability(
  editor: Pick<BlockNoteEditor, "isEditable" | "onEditableChange">,
) {
  const subscribe = useCallback(
    (callback: () => void) => editor.onEditableChange(callback),
    [editor],
  );
  const getSnapshot = useCallback(() => editor.isEditable, [editor]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
