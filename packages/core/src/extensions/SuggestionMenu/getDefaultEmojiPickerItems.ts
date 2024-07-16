import type { Emoji, EmojiMartData } from "@emoji-mart/data";
import { SearchIndex, init } from "emoji-mart";

import { checkDefaultInlineContentTypeInSchema } from "../../blocks/defaultBlockTypeGuards";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema";
import { DefaultGridSuggestionItem } from "./DefaultGridSuggestionItem";

let data:
  | Promise<{
      default: EmojiMartData;
    }>
  | undefined;

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

  if (!data) {
    // use a dynamic import to encourage bundle-splitting
    // and a smaller initial client bundle size
    data = import("@emoji-mart/data", { assert: { type: "json" } }) as any;
    const emojiMartData = (await data)!.default;
    await init({ data: emojiMartData });
  }

  const emojiMartData = (await data)!.default;

  const emojisToShow =
    query.trim() === ""
      ? Object.values(emojiMartData.emojis)
      : ((await SearchIndex.search(query)) as Emoji[]);

  return emojisToShow.map((emoji) => ({
    id: emoji.skins[0].native,
    onItemClick: () => editor.insertInlineContent(emoji.skins[0].native + " "),
  }));
}
