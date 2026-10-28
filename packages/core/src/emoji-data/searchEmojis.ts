import type { FrimousseEmoji } from "./frimousse/types.js";

function foldSearchText(value: string, locale: string): string {
  return value
    .toLocaleLowerCase(locale)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * Matches without accents or diacritics. Pass the data's locale for
 * locale-aware casing. Defaults to English.
 */
export function searchEmojis(
  emojis: FrimousseEmoji[],
  query: string,
  locale: string = "en",
): FrimousseEmoji[] {
  const casingLocale = new Intl.Locale(locale).language;
  const searchText = foldSearchText(query, casingLocale).trim();
  if (!searchText) {
    return emojis;
  }

  const scores = new WeakMap<FrimousseEmoji, number>();

  return emojis
    .filter((emoji) => {
      let score = 0;

      if (foldSearchText(emoji.label, casingLocale).includes(searchText)) {
        score += 10;
      }

      for (const tag of emoji.tags) {
        if (foldSearchText(tag, casingLocale).includes(searchText)) {
          score += 1;
        }
      }

      if (score > 0) {
        scores.set(emoji, score);
        return true;
      }

      return false;
    })
    .sort((a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0));
}
