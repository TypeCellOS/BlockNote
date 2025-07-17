import { BlockNoteEditor, StyleSchema } from "@blocknote/core";

import { useCallback, useState } from "react";
import { useBlockNoteContext } from "../editor/BlockNoteContext.js";
import { useEditorChange } from "./useEditorChange.js";
import { useEditorSelectionChange } from "./useEditorSelectionChange.js";

export function useActiveStyles<T extends StyleSchema>(
  editor?: BlockNoteEditor<any, any, T>,
) {
  const editorContext = useBlockNoteContext<any, any, T>();
  if (!editor) {
    editor = editorContext?.editor;
  }

  if (!editor) {
    throw new Error(
      "'editor' is required, either from BlockNoteContext or as a function argument",
    );
  }

  const e = editor;

  const [styles, setStyles] = useState(() => e.getActiveStyles());

  const updateStyles = useCallback(() => {
    setStyles(e.getActiveStyles());
  }, [e]);

  // Updates state on editor content change.
  useEditorChange(updateStyles, e);

  // Updates state on selection change.
  useEditorSelectionChange(updateStyles, e);

  return styles;
}
