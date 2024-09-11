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
  const items = ["make_longer", "make_shorter", "rewrite"] as const;

  const dict = getAIDictionary(editor);

  return items.map((item) => ({
    name: item,
    title: dict.ai_menu[item].title,
    onItemClick: async () => {
      (editor.extensions.aiMenu as AIMenuProsemirrorPlugin).close();
      (
        editor.extensions.aiInlineToolbar as AIInlineToolbarProsemirrorPlugin
      ).open(dict.ai_menu[item].title, operation);
    },
  }));
}
