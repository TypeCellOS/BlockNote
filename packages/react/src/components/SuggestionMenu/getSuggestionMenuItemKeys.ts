import type { DefaultReactSuggestionItem } from "./types.js";

/**
 * Returns a React key for each item, in the same order. An item is identified
 * by its `key` and title together, so a renamed copy of an item keeps its own
 * identity. Items that repeat both get a count of earlier repeats added.
 */
export function getSuggestionMenuItemKeys(
  items: readonly Pick<DefaultReactSuggestionItem, "key" | "title">[],
): string[] {
  const seenIdentities = new Map<string, number>();
  return items.map((item) => {
    const identity = JSON.stringify([item.key ?? null, item.title]);
    const count = seenIdentities.get(identity) ?? 0;
    seenIdentities.set(identity, count + 1);
    return `${count}:${identity}`;
  });
}
