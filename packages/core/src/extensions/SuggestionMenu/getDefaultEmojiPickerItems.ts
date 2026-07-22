import type { FrimousseEmojiData } from "@blocknote/emoji-data";

import { defaultInlineContentSchema } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import { DefaultGridSuggestionItem } from "./DefaultGridSuggestionItem.js";

let currentLocale: string | undefined;
let dataPromise: Promise<FrimousseEmojiData> | undefined;

async function loadEmojiData(locale?: string) {
  const targetLocale = locale ?? "en";

  if (dataPromise && currentLocale === targetLocale) {
    return dataPromise;
  }

  currentLocale = targetLocale;
  dataPromise = import("@blocknote/emoji-data").then(({ loadFrimousseData }) =>
    loadFrimousseData(targetLocale),
  );

  return dataPromise;
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

  const data = await loadEmojiData(editor.dictionary.locale);

  let emojisToShow = data.emojis;

  if (query.trim() !== "") {
    const { searchEmojis } = await import("@blocknote/emoji-data");
    emojisToShow = searchEmojis(data.emojis, query);
  }

  return emojisToShow.map((emoji) => ({
    id: emoji.emoji,
    onItemClick: () => editor.insertInlineContent(emoji.emoji + " "),
  }));
}
