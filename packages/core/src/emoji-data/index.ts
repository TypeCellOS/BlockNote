export type { EmojiI18n } from "./i18n/dictionary.js";
export { loadEmojiLocale } from "./loadLocale.js";
export { searchEmojis } from "./searchEmojis.js";

export type {
  FrimousseEmojiData,
  FrimousseEmoji,
  FrimousseCategory,
} from "./frimousse/index.js";
export { loadFrimousseData } from "./frimousse/index.js";
export { seedFrimousseCache } from "./frimousse/index.js";
