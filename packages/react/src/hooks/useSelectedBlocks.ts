import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { GapCursor } from "@tiptap/pm/gapcursor";
import { useEditorState } from "./useEditorState.js";

/**
 * Returns the blocks spanned by the selection, or the single block with the
 * text cursor or block selection. Returns an empty array when the cursor is
 * in a gap between blocks. Re-renders automatically when the selection changes.
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
      editor.transact((tr) => {
        if (tr.selection instanceof GapCursor) {
          return [];
        }

        return (
          editor.getSelection()?.blocks ?? [
            editor.getTextCursorPosition().block,
          ]
        );
      }),
  });
}
