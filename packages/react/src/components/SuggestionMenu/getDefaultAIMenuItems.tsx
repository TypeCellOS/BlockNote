import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  mockAIOperation,
  StyleSchema,
} from "@blocknote/core";
import { DefaultReactSuggestionItem } from "./types";
import { TextSelection } from "@tiptap/pm/state";

// TODO: Maybe we don't want to define the default AI prompts based on the
//  dictionary
export function getDefaultAIMenuItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  query: string
): DefaultReactSuggestionItem[] {
  return Object.values(editor.dictionary.ai_menu).map((item) => ({
    ...item,
    onItemClick: async () => {
      const oldDocSize = editor._tiptapEditor.state.doc.nodeSize;
      const startPos = editor._tiptapEditor.state.selection.from;
      const endPos = editor._tiptapEditor.state.selection.to;
      const originalContent = editor.getSelection()?.blocks || [
        editor.getTextCursorPosition().block,
      ];

      const prompt =
        item.title === editor.dictionary.ai_menu.custom_prompt.title
          ? query
          : item.title;

      editor.replaceBlocks(
        originalContent,
        (await mockAIOperation(editor, prompt, {
          operation: "replaceBlock",
          blockIdentifier: editor.getTextCursorPosition().block,
        })) as any[]
      );

      const newDocSize = editor._tiptapEditor.state.doc.nodeSize;

      editor._tiptapEditor.view.dispatch(
        editor._tiptapEditor.state.tr.setSelection(
          TextSelection.create(
            editor._tiptapEditor.state.doc,
            startPos,
            endPos + newDocSize - oldDocSize
          )
        )
      );

      editor.formattingToolbar.closeMenu();
      editor.focus();
      editor.aiInlineToolbar.open(prompt, originalContent);
    },
  }));
}
