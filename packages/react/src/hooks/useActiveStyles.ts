import { BlockNoteEditor, StyleSchema } from "@blocknote/core";

import { useState } from "react";
import { useBlockNoteContext } from "../editor/BlockNoteContext";
import { useEditorChange } from "./useEditorChange";
import { useEditorSelectionChange } from "./useEditorSelectionChange";

export function useActiveStyles<T extends StyleSchema>(
  editor?: BlockNoteEditor<any, any, T>
) {
  const editorContext = useBlockNoteContext<any, any, T>();
  if (!editor) {
    editor = editorContext?.editor;
  }

  if (!editor) {
    throw new Error(
      "'editor' is required, either from BlockNoteContext or as a function argument"
    );
  }

  const e = editor;

  const [styles, setStyles] = useState(() => e.getActiveStyles());

  // Updates state on editor content change.
  useEditorChange(() => {
    setStyles(e.getActiveStyles());
  }, e);

  // Updates state on selection change.
  useEditorSelectionChange(() => {
    setStyles(e.getActiveStyles());
  }, e);

  return styles;
}
