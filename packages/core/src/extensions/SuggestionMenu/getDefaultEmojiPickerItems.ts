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
): Promise<DefaultGridSuggestionItem[]> {
  if (
    !checkDefaultInlineContentTypeInSchema("emoji", editor) ||
    !checkDefaultInlineContentTypeInSchema("text", editor)
  ) {
    return [];
  }

  const emojisToShow =
    query === ""
      ? Object.values(emojiMartData.emojis)
      : ((await SearchIndex.search(query)) as Emoji[]);

  return emojisToShow.map((emoji: Emoji) => ({
    id: emoji.skins[0].native,
    onItemClick: () => {
      // This is a bit hacky since we're doing 2 insertions, but it seems like
      // writing a type guard to check if multiple default inline content types
      // are in the schema is quite a pain as opposed to checking just one. And
      // so this seems like a more reasonable option for now.
      if (checkDefaultInlineContentTypeInSchema("emoji", editor)) {
        editor.insertInlineContent([
          {
            type: "emoji",
            props: {
              emoji: emoji.skins[0].native,
            },
          },
        ]);
      }

      if (checkDefaultInlineContentTypeInSchema("text", editor)) {
        editor.insertInlineContent([
          {
            type: "text",
            text: " ",
            styles: {},
          },
        ]);
      }
    },
  }));
}
