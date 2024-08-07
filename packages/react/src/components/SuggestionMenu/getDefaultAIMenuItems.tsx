import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { DefaultReactSuggestionItem } from "./types";

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
      editor.aiInlineToolbar.open(
        editor.dictionary.ai_menu.custom_prompt.title === item.title
          ? query
          : item.title,
        "insertAfterSelection"
      );
    },
  }));
}
