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

import { aiBlockConfig } from "../../blocks/AIBlockContent/AIBlockContent";
import { getAIDictionary } from "../../i18n/dictionary";
import { BlockNoteAIContextValue } from "../BlockNoteAIContext";

const Icons = {
  AI: RiSparkling2Fill,
};

export function getAISlashMenuItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  ctx: BlockNoteAIContextValue
): DefaultReactSuggestionItem[] {
  const items = [
    {
      name: "ai",
      onItemClick: () => {
        const cursor = editor.getTextCursorPosition();
        if (
          cursor.block.content &&
          Array.isArray(cursor.block.content) && // isarray check not ideal
          cursor.block.content.length === 0 &&
          cursor.prevBlock
        ) {
          ctx.setAiMenuBlockID(cursor.prevBlock.id);
        } else {
          ctx.setAiMenuBlockID(cursor.block.id);
        }
      },
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
