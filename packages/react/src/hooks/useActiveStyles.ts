import { BlockNoteEditor, Styles, StyleSchema } from "@blocknote/core";

import { useBlockNoteContext } from "../editor/BlockNoteContext.js";
import { useEditorState } from "./useEditorState.js";

/**
 * Returns the currently active text styles (e.g., bold, italic) at the editor's
 * current cursor position or selection. Re-renders automatically when the active
 * styles change.
 *
 * @param editor - The BlockNote editor instance. If omitted, uses the editor
 * from the nearest `BlockNoteContext`.
 * @returns The set of active styles at the current cursor position or selection.
 */
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
