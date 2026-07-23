import type { FrimousseEmoji } from "./frimousse/types.js";

export function searchEmojis(
  emojis: FrimousseEmoji[],
  query: string,
): FrimousseEmoji[] {
  if (!query) {
    return emojis;
  }

  const searchText = query.toLowerCase().trim();
  const scores = new WeakMap<FrimousseEmoji, number>();

  return emojis
    .filter((emoji) => {
      let score = 0;

      if (emoji.label.toLowerCase().includes(searchText)) {
        score += 10;
      }

      for (const tag of emoji.tags) {
        if (tag.toLowerCase().includes(searchText)) {
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
