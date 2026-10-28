import { defaultInlineContentSchema } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import { DefaultGridSuggestionItem } from "./DefaultGridSuggestionItem.js";

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

  const { loadFrimousseData, searchEmojis } =
    await import("../../emoji-data/index.js");
  // The loader owns canonical-locale caching and evicts rejected loads for retry.
  const data = await loadFrimousseData(editor.dictionary.locale ?? "en");

  return searchEmojis(data.emojis, query, data.locale).map((emoji) => ({
    id: emoji.emoji,
    onItemClick: () => editor.insertInlineContent(emoji.emoji + " "),
  }));
}
