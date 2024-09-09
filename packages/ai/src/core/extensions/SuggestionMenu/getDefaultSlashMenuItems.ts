import {
  DefaultSuggestionItem,
  insertOrUpdateBlock,
  getDefaultSlashMenuItems as getDefaultCoreSlashMenuItems,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

import { checkDefaultBlockTypeInSchema } from "../../blocks/defaultBlockTypeGuards";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";

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
    ...editor.dictionary.slash_menu.ai,
  });

  if (checkDefaultBlockTypeInSchema("ai", editor)) {
    items.splice(insertionIndex, 0, {
      onItemClick: () => {
        insertOrUpdateBlock(editor, {
          type: "ai",
        });
      },
      name: "ai_block",
      ...editor.dictionary.slash_menu.ai_block,
    });
  }

  return items;
}
