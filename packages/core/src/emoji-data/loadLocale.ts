import type { EmojiI18n } from "./i18n/dictionary.js";

const LOCALE_ALIASES: Record<string, string> = {
  no: "nb",
  "zh-tw": "zh-hant",
};

const cache = new Map<string, EmojiI18n>();

export async function loadEmojiLocale(locale: string): Promise<EmojiI18n> {
  const normalizedLocale = locale.toLowerCase();
  const cached = cache.get(normalizedLocale);
  if (cached) {
    return cached;
  }

  const resolved = LOCALE_ALIASES[normalizedLocale] ?? normalizedLocale;
  const { emojiLocales } = await import("./i18n/locales.js");
  const result =
    emojiLocales[resolved as keyof typeof emojiLocales] ??
    emojiLocales[resolved.split("-")[0] as keyof typeof emojiLocales] ??
    emojiLocales.en;
  cache.set(normalizedLocale, result);
  return result;
}
