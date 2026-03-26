import type { BlockNoteEditor } from "@blocknote/core";
import { useEffect } from "react";
import { useBlockNoteContext } from "../editor/BlockNoteContext.js";

/**
 * Subscribes to editor selection changes. The callback is invoked whenever the
 * user's cursor position or text selection changes, and the subscription is
 * automatically cleaned up when the component unmounts.
 *
 * @param callback - Function called when the selection changes.
 * @param editor - The BlockNote editor instance. If omitted, uses the editor
 * from the nearest `BlockNoteContext`.
 * @param includeSelectionChangedByRemote - Whether to also fire the callback
 * when the selection is changed by a remote collaborator. Defaults to `false`.
 */
export function useEditorSelectionChange(
  callback: () => void,
  editor?: BlockNoteEditor<any, any, any>,
  includeSelectionChangedByRemote?: boolean,
) {
  const editorContext = useBlockNoteContext();
  if (!editor) {
    editor = editorContext?.editor;
  }

  useEffect(() => {
    if (!editor) {
      throw new Error(
        "'editor' is required, either from BlockNoteContext or as a function argument",
      );
    }
    return editor.onSelectionChange(callback, includeSelectionChangedByRemote);
  }, [callback, editor, includeSelectionChangedByRemote]);
}
