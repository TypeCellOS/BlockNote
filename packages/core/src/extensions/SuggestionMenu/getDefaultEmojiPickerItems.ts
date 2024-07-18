import type { Emoji, EmojiMartData } from "@emoji-mart/data";

import { checkDefaultInlineContentTypeInSchema } from "../../blocks/defaultBlockTypeGuards";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema";
import { DefaultGridSuggestionItem } from "./DefaultGridSuggestionItem";

let data:
  | Promise<{
      default: EmojiMartData;
    }>
  | undefined;

let emojiMart: typeof import("emoji-mart") | undefined;

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

    // load dynamically because emoji-mart doesn't specify type: module and breaks in nodejs
    emojiMart = await import("emoji-mart");
    const emojiMartData = (await data)!.default;
    await emojiMart.init({ data: emojiMartData });
  }

  const emojiMartData = (await data)!.default;

  const emojisToShow =
    query.trim() === ""
      ? Object.values(emojiMartData.emojis)
      : ((await emojiMart!.SearchIndex.search(query)) as Emoji[]);

  return emojisToShow.map((emoji) => ({
    id: emoji.skins[0].native,
    onItemClick: () => editor.insertInlineContent(emoji.skins[0].native + " "),
  }));
}
