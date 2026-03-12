import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import {
  EmojiLocale,
  getDefaultEmojiPickerItems,
} from "@blocknote/core/extensions";
import { DefaultReactGridSuggestionItem } from "./types.js";

export async function getDefaultReactEmojiPickerItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  query: string,
  locale?: EmojiLocale,
): Promise<DefaultReactGridSuggestionItem[]> {
  return (await getDefaultEmojiPickerItems(editor, query, locale)).map(
    ({ id, onItemClick }) => ({
      id,
      onItemClick,
      icon: id as any,
    }),
  );
}
