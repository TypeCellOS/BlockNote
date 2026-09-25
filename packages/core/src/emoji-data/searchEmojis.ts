import type { FrimousseEmoji } from "./frimousse/types.js";

function foldSearchText(value: string): string {
  return value.toLowerCase().replace(/\u0307/g, "");
}

export function searchEmojis(
  emojis: FrimousseEmoji[],
  query: string,
): FrimousseEmoji[] {
  const searchText = foldSearchText(query).trim();
  if (!searchText) {
    return emojis;
  }

  const scores = new WeakMap<FrimousseEmoji, number>();

  return emojis
    .filter((emoji) => {
      let score = 0;

      if (foldSearchText(emoji.label).includes(searchText)) {
        score += 10;
      }

      for (const tag of emoji.tags) {
        if (foldSearchText(tag).includes(searchText)) {
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
