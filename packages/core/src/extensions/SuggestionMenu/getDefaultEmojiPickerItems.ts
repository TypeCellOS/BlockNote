import type { Emoji, EmojiMartData } from "@emoji-mart/data";

import { checkDefaultInlineContentTypeInSchema } from "../../blocks/defaultBlockTypeGuards.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import { DefaultGridSuggestionItem } from "./DefaultGridSuggestionItem.js";

// Temporary fix for https://github.com/missive/emoji-mart/pull/929
let emojiMart: typeof import("emoji-mart") | undefined;
let emojiData: EmojiMartData | undefined;

async function loadEmojiMart() {
  if (!emojiMart || !emojiData) {
    // load dynamically because emoji-mart doesn't specify type: module and breaks in nodejs
    const [emojiMartModule, emojiDataModule] = await Promise.all([
      import("emoji-mart"),
      // use a dynamic import to encourage bundle-splitting
      // and a smaller initial client bundle size
      import("@emoji-mart/data"),
    ]);

    emojiMart =
      "default" in emojiMartModule ? emojiMartModule.default : emojiMartModule;
    emojiData =
      "default" in emojiDataModule
        ? (emojiDataModule.default as EmojiMartData)
        : (emojiDataModule as EmojiMartData);

    emojiMart.init({ data: emojiData });
  }

  return { emojiMart, emojiData };
}

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

  const { emojiData } = await loadEmojiMart();

  const emojisToShow =
    query.trim() === ""
      ? Object.values(emojiData.emojis)
      : ((await emojiMart!.SearchIndex.search(query)) as Emoji[]);

  return emojisToShow.map((emoji) => ({
    id: emoji.skins[0].native,
    onItemClick: () => editor.insertInlineContent(emoji.skins[0].native + " "),
  }));
}
