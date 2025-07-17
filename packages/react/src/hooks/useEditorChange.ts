import type { BlockNoteEditor } from "@blocknote/core";
import { useEffect } from "react";
import { useBlockNoteContext } from "../editor/BlockNoteContext.js";

export function useEditorChange(
  callback: Parameters<BlockNoteEditor<any, any, any>["onChange"]>[0],
  editor?: BlockNoteEditor<any, any, any>,
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

    return editor.onChange(callback);
  }, [callback, editor]);
}
