import { BlockNoteEditor, Styles, StyleSchema } from "@blocknote/core";

import { useBlockNoteContext } from "../editor/BlockNoteContext.js";
import { useEditorState } from "./useEditorState.js";

export function useActiveStyles<T extends StyleSchema>(
  editor?: BlockNoteEditor<any, any, T>,
): Styles<T> {
  const editorContext = useBlockNoteContext<any, any, T>();
  if (!editor) {
    editor = editorContext?.editor;
  }

  if (!editor) {
    throw new Error(
      "'editor' is required, either from BlockNoteContext or as a function argument",
    );
  }

  const styles = useEditorState({
    editor,
    selector: ({ editor }) => editor.getActiveStyles(),
  });

  return styles;
}
