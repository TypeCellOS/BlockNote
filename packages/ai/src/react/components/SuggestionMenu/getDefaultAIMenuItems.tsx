import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { DefaultReactSuggestionItem } from "@blocknote/react";

import { BlockNoteEditor } from "../../../core/editor/BlockNoteEditor";
import { Dictionary } from "../../../core/i18n/dictionary";
import { AIInlineToolbarProsemirrorPlugin } from "../../../core";

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
  return Object.values(
    (editor.dictionary as unknown as Dictionary).ai_menu // TODO
  ).map((item) => ({
    name: item.title as any,
    ...item,
    onItemClick: async () => {
      (editor.extensions.aiInlineToolbar as AIInlineToolbarProsemirrorPlugin) // TODO
        .open(
          (editor.dictionary as unknown as Dictionary).ai_menu.custom_prompt // TODO
            .title === item.title
            ? query
            : item.title,
          "insertAfterSelection"
        );
    },
  }));
}
