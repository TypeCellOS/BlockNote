import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useEditorState } from "./useEditorState.js";

/**
 * Returns the blocks that are currently selected in the editor. If no
 * multi-block selection exists, returns an array containing the single block
 * at the text cursor position. Re-renders automatically when the selection
 * changes.
 *
 * @param editor - The BlockNote editor instance. If omitted, uses the editor
 * from the nearest `BlockNoteContext`.
 * @returns An array of the currently selected blocks.
 */
export function useSelectedBlocks<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(editor?: BlockNoteEditor<BSchema, ISchema, SSchema>) {
  return useEditorState({
    editor,
    selector: ({ editor }) =>
      editor.getSelection()?.blocks || [editor.getTextCursorPosition().block],
  });
}
