import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { DefaultSuggestionItem } from "../../extensions/SuggestionMenu/DefaultSuggestionItem.js";
import { insertOrUpdateBlock } from "../../extensions/SuggestionMenu/getDefaultSlashMenuItems.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import { createPageBreakBlockConfig } from "./block.js";

export function checkPageBreakBlocksInSchema<
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<any, I, S>,
): editor is BlockNoteEditor<
  {
    pageBreak: ReturnType<typeof createPageBreakBlockConfig>;
  },
  I,
  S
> {
  return "pageBreak" in editor.schema.blockSchema;
}

export function getPageBreakSlashMenuItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(editor: BlockNoteEditor<BSchema, I, S>) {
  const items: (Omit<DefaultSuggestionItem, "key"> & { key: "page_break" })[] =
    [];

  if (checkPageBreakBlocksInSchema(editor)) {
    items.push({
      ...editor.dictionary.slash_menu.page_break,
      onItemClick: () => {
        insertOrUpdateBlock(editor, {
          type: "pageBreak",
        });
      },
      key: "page_break",
    });
  }

  return items;
}
