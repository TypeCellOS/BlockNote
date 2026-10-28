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
 * Ranking counts matching stored tags; it does not reconstruct tags removed
 * during data generation.
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

  const matches: { emoji: FrimousseEmoji; score: number }[] = [];
  for (const emoji of emojis) {
    let score = foldSearchText(emoji.label, casingLocale).includes(searchText)
      ? 10
      : 0;
    for (const tag of emoji.tags) {
      if (foldSearchText(tag, casingLocale).includes(searchText)) {
        score += 1;
      }
    }
    if (score > 0) {
      matches.push({ emoji, score });
    }
  }

  return matches.sort((a, b) => b.score - a.score).map(({ emoji }) => emoji);
}
