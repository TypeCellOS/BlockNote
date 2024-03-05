import { BlockNoteEditor, StyleSchema } from "@blocknote/core";
import { useState } from "react";
import { useEditorContentChange } from "./useEditorContentChange";
import { useEditorSelectionChange } from "./useEditorSelectionChange";

export function useActiveStyles<T extends StyleSchema>(
  editor: BlockNoteEditor<any, any, T>
) {
  const [styles, setStyles] = useState(() => editor.getActiveStyles());

  // Updates state on editor content change.
  useEditorContentChange(editor, () => {
    setStyles(editor.getActiveStyles());
  });

  // Updates state on selection change.
  useEditorSelectionChange(editor, () => {
    setStyles(editor.getActiveStyles());
  });

  return styles;
}
