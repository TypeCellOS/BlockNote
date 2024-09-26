import {
  BlockNoteEditor,
  BlockSchema,
  checkBlockTypeInSchema,
  InlineContentSchema,
  insertOrUpdateBlock,
  StyleSchema,
} from "@blocknote/core";
import { DefaultReactSuggestionItem } from "@blocknote/react";
import { RiSparkling2Fill } from "react-icons/ri";

import { AIMenuProsemirrorPlugin } from "../../extensions/AIMenu/AIMenuPlugin";

import { aiBlockConfig } from "../../blocks/AIBlockContent/AIBlockContent";
import { getAIDictionary } from "../../i18n/dictionary";

const Icons = {
  AI: RiSparkling2Fill,
};

export function getAISlashMenuItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(editor: BlockNoteEditor<BSchema, I, S>): DefaultReactSuggestionItem[] {
  const items = [
    {
      name: "ai",
      onItemClick: () =>
        (editor.extensions.aiMenu as AIMenuProsemirrorPlugin).open(),
      ...getAIDictionary(editor).slash_menu.ai,
      icon: <Icons.AI />,
    },
  ];

  if (checkBlockTypeInSchema(aiBlockConfig, editor)) {
    items.push({
      name: "ai_block",
      onItemClick: () => {
        insertOrUpdateBlock(editor, {
          type: "ai",
        });
      },
      ...getAIDictionary(editor).slash_menu.ai_block,
      icon: <Icons.AI />,
    });
  }

  return items;
}
