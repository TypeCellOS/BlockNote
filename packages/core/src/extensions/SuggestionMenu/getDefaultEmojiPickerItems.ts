import type { Emoji, EmojiMartData } from "@emoji-mart/data";

import { defaultInlineContentSchema } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import { DefaultGridSuggestionItem } from "./DefaultGridSuggestionItem.js";

// Temporary fix for https://github.com/missive/emoji-mart/pull/929
let emojiLoadingPromise:
  | Promise<{
      emojiMart: typeof import("emoji-mart");
      emojiData: EmojiMartData;
    }>
  | undefined;

async function loadEmojiMart() {
  if (emojiLoadingPromise) {
    return emojiLoadingPromise;
  }

  emojiLoadingPromise = (async () => {
    // load dynamically because emoji-mart doesn't specify type: module and breaks in nodejs
    const [emojiMartModule, emojiDataModule] = await Promise.all([
      import("emoji-mart"),
      // use a dynamic import to encourage bundle-splitting
      // and a smaller initial client bundle size
      import("@emoji-mart/data"),
    ]);

    const emojiMart =
      "default" in emojiMartModule ? emojiMartModule.default : emojiMartModule;
    const emojiData =
      "default" in emojiDataModule
        ? (emojiDataModule.default as EmojiMartData)
        : (emojiDataModule as EmojiMartData);

    await emojiMart.init({ data: emojiData });

    return { emojiMart, emojiData };
  })();

  return emojiLoadingPromise;
}

export async function getDefaultEmojiPickerItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  query: string,
): Promise<DefaultGridSuggestionItem[]> {
  if (
    !("text" in editor.schema.inlineContentSchema) ||
    editor.schema.inlineContentSchema["text"] !==
      defaultInlineContentSchema["text"]
  ) {
    return [];
  }

  const { emojiData, emojiMart } = await loadEmojiMart();

  const emojisToShow =
    query.trim() === ""
      ? Object.values(emojiData.emojis)
      : ((await emojiMart!.SearchIndex.search(query)) as Emoji[]);

  return emojisToShow.map((emoji) => ({
    id: emoji.skins[0].native,
    onItemClick: () => editor.insertInlineContent(emoji.skins[0].native + " "),
  }));
}
