import {
  BlockSchema,
  InlineContentSchema,
  insertOrUpdateBlock,
  StyleSchema,
} from "@blocknote/core";
import { RiSparkling2Fill } from "react-icons/ri";
import {
  DefaultReactSuggestionItem,
  getDefaultReactSlashMenuItems as getDefaultCoreSlashMenuItems,
} from "@blocknote/react";

import { checkDefaultBlockTypeInSchema } from "../../../core/blocks/defaultBlockTypeGuards";
import type { BlockNoteEditor } from "../../../core/editor/BlockNoteEditor";

const Icons = {
  AI: RiSparkling2Fill,
};

export function getDefaultReactSlashMenuItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(editor: BlockNoteEditor<BSchema, I, S>): DefaultReactSuggestionItem[] {
  const items: DefaultReactSuggestionItem[] =
    getDefaultCoreSlashMenuItems(editor);
  const insertionIndex = items.findIndex((item) => item.name === "emoji");

  items.splice(insertionIndex, 0, {
    name: "ai",
    onItemClick: () => editor.openSelectionMenu("`"),
    ...editor.dictionary.slash_menu.ai,
    icon: <Icons.AI />,
  });

  if (checkDefaultBlockTypeInSchema("ai", editor)) {
    items.splice(insertionIndex, 0, {
      name: "ai_block",
      onItemClick: () => {
        insertOrUpdateBlock(editor, {
          type: "ai",
        });
      },
      ...editor.dictionary.slash_menu.ai_block,
      icon: <Icons.AI />,
    });
  }

  return items;
}
