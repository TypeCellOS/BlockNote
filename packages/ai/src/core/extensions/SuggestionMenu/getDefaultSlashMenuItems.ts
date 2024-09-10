import {
  BlockNoteEditor,
  BlockSchema,
  DefaultSuggestionItem,
  InlineContentSchema,
  StyleSchema,
  checkBlockTypeInSchema,
  getDefaultSlashMenuItems as getDefaultCoreSlashMenuItems,
  insertOrUpdateBlock,
} from "@blocknote/core";

import { aiBlockConfig } from "../../blocks/AIBlockContent/AIBlockContent";
import { getAIDictionary } from "../../i18n/dictionary";

export function getDefaultSlashMenuItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(editor: BlockNoteEditor<BSchema, I, S>) {
  const items: DefaultSuggestionItem[] = getDefaultCoreSlashMenuItems(editor);
  const insertionIndex = items.findIndex((item) => item.name === "emoji");

  items.splice(insertionIndex, 0, {
    onItemClick: () => editor.openSelectionMenu("`"),
    name: "ai",
    ...getAIDictionary(editor).slash_menu.ai,
  });

  if (checkBlockTypeInSchema(aiBlockConfig, editor)) {
    items.splice(insertionIndex, 0, {
      onItemClick: () => {
        insertOrUpdateBlock(editor, {
          type: "ai",
        });
      },
      name: "ai_block",
      ...getAIDictionary(editor).slash_menu.ai_block,
    });
  }

  return items;
}
