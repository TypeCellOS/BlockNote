import {
  BlockNoteEditor,
  BlockSchema,
  getDefaultEmojiPickerItems,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { DefaultReactGridSuggestionItem } from "./types.js";

export async function getDefaultReactEmojiPickerItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  query: string,
): Promise<DefaultReactGridSuggestionItem[]> {
  return (await getDefaultEmojiPickerItems(editor, query)).map(
    ({ id, onItemClick }) => ({
      id,
      onItemClick,
      icon: id as any,
    }),
  );
}
