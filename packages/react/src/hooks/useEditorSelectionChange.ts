import type { BlockNoteEditor } from "@blocknote/core";
import { useEffect } from "react";
import { useBlockNoteContext } from "../editor/BlockNoteContext.js";

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
