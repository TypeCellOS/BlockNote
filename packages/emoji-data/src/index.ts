export type {
  Emoji,
  EmojiCategory,
  EmojiMartData,
  EmojiSkin,
} from "./data/index.js";
export type { EmojiI18n } from "./i18n/dictionary.js";
export { loadEmojiLocale } from "./loadLocale.js";
export { loadSearchData, applySearchOverlay } from "./loadSearchData.js";
export type { SearchOverlay } from "./loadSearchData.js";

import type { EmojiMartData } from "./data/index.js";

let cached: EmojiMartData | undefined;

export async function loadEmojiData(): Promise<EmojiMartData> {
  if (cached) {
    return cached;
  }
  const { emojiData } = await import("./data/index.js");
  cached = emojiData;
  return emojiData;
}
