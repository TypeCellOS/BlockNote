import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { DefaultReactSuggestionItem } from "@blocknote/react";
import { RiSparkling2Fill } from "react-icons/ri";

import { getAIExtension } from "../../AIExtension.js";
import { getAIDictionary } from "../../i18n/dictionary.js";
const Icons = {
  AI: RiSparkling2Fill,
};

/**
 * Returns AI related items that can be added to the slash menu
 */
export function getAISlashMenuItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(editor: BlockNoteEditor<BSchema, I, S>): DefaultReactSuggestionItem[] {
  const ai = getAIExtension(editor);
  const items = [
    {
      key: "ai",
      onItemClick: () => {
        const cursor = editor.getTextCursorPosition();
        if (
          cursor.block.content &&
          Array.isArray(cursor.block.content) && // isarray check not ideal
          cursor.block.content.length === 0 &&
          cursor.prevBlock
        ) {
          ai.openAIMenuAtBlock(cursor.prevBlock.id);
        } else {
          ai.openAIMenuAtBlock(cursor.block.id);
        }
      },
      ...getAIDictionary(editor).slash_menu.ai,
      icon: <Icons.AI />,
    },
  ];

  return items;
}
