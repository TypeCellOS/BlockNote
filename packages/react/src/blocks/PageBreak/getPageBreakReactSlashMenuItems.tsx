import {
  BlockNoteEditor,
  BlockSchema,
  getPageBreakSlashMenuItems,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { DefaultReactSuggestionItem } from "../../components/SuggestionMenu/types.js";
import { TbPageBreak } from "react-icons/tb";

const icons = {
  page_break: TbPageBreak,
};

export function getPageBreakReactSlashMenuItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, I, S>,
): (Omit<DefaultReactSuggestionItem, "key"> & { key: "page_break" })[] {
  return getPageBreakSlashMenuItems(editor).map((item) => {
    const Icon = icons[item.key];
    return {
      ...item,
      icon: <Icon size={18} />,
    };
  });
}
