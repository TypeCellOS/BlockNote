import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { DefaultReactSuggestionItem } from "@blocknote/react";

import {
  AIInlineToolbarProsemirrorPlugin,
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
  query: string
): DefaultReactSuggestionItem[] {
  return Object.values(getAIDictionary(editor).ai_menu).map((item) => ({
    name: item.title as any,
    ...item,
    onItemClick: async () => {
      (editor.extensions.aiInlineToolbar as AIInlineToolbarProsemirrorPlugin) // TODO
        .open(
          getAIDictionary(editor).ai_menu.custom_prompt.title === item.title
            ? query
            : item.title,
          "insertAfterSelection"
        );
    },
  }));
}
