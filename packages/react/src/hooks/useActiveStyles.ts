import { BlockNoteEditor, StyleSchema } from "@blocknote/core";
import { useState } from "react";
import { useEditorChange } from "./useEditorChange";
import { useEditorSelectionChange } from "./useEditorSelectionChange";

export function useActiveStyles<T extends StyleSchema>(
  editor: BlockNoteEditor<any, any, T>
) {
  const [styles, setStyles] = useState(() => editor.getActiveStyles());

  // Updates state on editor content change.
  useEditorChange((editor) => {
    setStyles(editor.getActiveStyles());
  }, editor);

  // Updates state on selection change.
  useEditorSelectionChange(() => {
    setStyles(editor.getActiveStyles());
  }, editor);

  return styles;
}
