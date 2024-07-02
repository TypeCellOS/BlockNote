import {
  BlockNoteEditor,
  BlockSchema,
  getDefaultEmojiPickerItems,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { DefaultReactGridSuggestionItem } from "./types";

export async function getDefaultReactEmojiPickerItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  query: string
): Promise<(DefaultReactGridSuggestionItem & { emoji: string })[]> {
  return (await getDefaultEmojiPickerItems(editor, query)).map(
    ({ id, emoji }) => ({ id, emoji, icon: emoji as any })
  );
}
