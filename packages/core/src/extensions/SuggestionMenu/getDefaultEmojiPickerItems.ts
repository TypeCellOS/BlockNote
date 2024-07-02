import data, { Emoji, EmojiMartData } from "@emoji-mart/data";
import { init, SearchIndex } from "emoji-mart";

import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { checkDefaultInlineContentTypeInSchema } from "../../blocks/defaultBlockTypeGuards";
import { DefaultGridSuggestionItem } from "./DefaultGridSuggestionItem";

const emojiMartData = data as EmojiMartData;
init({ emojiMartData });

export async function getDefaultEmojiPickerItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  query: string
): Promise<(DefaultGridSuggestionItem & { emoji: string })[]> {
  if (!checkDefaultInlineContentTypeInSchema("emoji", editor)) {
    return [];
  }

  const emojisToShow =
    query === ""
      ? Object.values(emojiMartData.emojis)
      : ((await SearchIndex.search(query)) as Emoji[]);

  return emojisToShow.map((emoji: Emoji) => ({
    id: emoji.id,
    emoji: emoji.skins[0].native,
  }));
}
