import data, { Emoji, EmojiMartData } from "@emoji-mart/data";
import { init, SearchIndex } from "emoji-mart";

import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { checkDefaultInlineContentTypeInSchema } from "../../blocks/defaultBlockTypeGuards";
import { DefaultGridSuggestionItem } from "./DefaultGridSuggestionItem";

let dataInitialized = false;
const emojiMartData = data as EmojiMartData;

export async function getDefaultEmojiPickerItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  query: string
): Promise<DefaultGridSuggestionItem[]> {
  if (!checkDefaultInlineContentTypeInSchema("text", editor)) {
    return [];
  }

  if (!dataInitialized) {
    dataInitialized = true;
    await init({ emojiMartData });
  }

  const emojisToShow =
    query.trim() === ""
      ? Object.values(emojiMartData.emojis)
      : ((await SearchIndex.search(query)) as Emoji[]);

  return emojisToShow.map((emoji: Emoji) => ({
    id: emoji.skins[0].native,
    onItemClick: () => editor.insertInlineContent(emoji.skins[0].native + " "),
  }));
}
