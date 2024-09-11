import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { DefaultReactSuggestionItem } from "@blocknote/react";

import {
  AIInlineToolbarProsemirrorPlugin,
  AIMenuProsemirrorPlugin,
  getAIDictionary,
} from "../../../core";

// TODO: Maybe we don't want to define the default AI prompts based on the
//  dictionary
// TODO: name
export function getDefaultAIMenuItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  operation: "insertAfterSelection" | "replaceSelection"
): DefaultReactSuggestionItem[] {
  return Object.values(getAIDictionary(editor).ai_menu).map((item) => ({
    name: item.title as any,
    ...item,
    onItemClick: async () => {
      editor.formattingToolbar.closeMenu();
      (editor.extensions.aiMenu as AIMenuProsemirrorPlugin).close();
      (
        editor.extensions.aiInlineToolbar as AIInlineToolbarProsemirrorPlugin
      ).open(item.title, operation);
    },
  }));
}
