import { describe, expect, it } from "vite-plus/test";

import type { FrimousseEmoji } from "./frimousse/types.js";
import { searchEmojis } from "./searchEmojis.js";

describe("accent-insensitive emoji search", () => {
  it("keeps stable ties, duplicate references, and tag-weighted ranking without mutating input", () => {
    const first: FrimousseEmoji = {
      emoji: "😀",
      category: 0,
      version: 1,
      label: "Match",
      tags: [],
    };
    const tie = { ...first, emoji: "😃" };
    const strongest = { ...first, emoji: "😄", tags: ["match", "matching"] };
    const tagsOnly = {
      ...first,
      emoji: "😁",
      label: "Other",
      tags: ["match", "matching", "matcher"],
    };
    const noMatch = { ...first, emoji: "😆", label: "Unrelated" };
    const emojis = [first, tagsOnly, tie, strongest, noMatch, first];
    for (const emoji of emojis) {
      Object.freeze(emoji.tags);
      Object.freeze(emoji);
    }
    Object.freeze(emojis);

    const results = searchEmojis(emojis, "match");
    const expected = [strongest, first, tie, first, tagsOnly];
    expect(results).toHaveLength(expected.length);
    results.forEach((emoji, index) => expect(emoji).toBe(expected[index]));
    expect(searchEmojis(emojis, " \t ")).toBe(emojis);
    expect(searchEmojis(emojis, "absent")).toEqual([]);
  });

  it.each([
    ["café", "cafe"],
    ["corazón", "CORAZON"],
    ["cafe", "café"],
    ["café", "cafe\u0301"],
    ["cafe\u0301", "café"],
    ["gülümseme", "gulumseme"],
  ])("matches %s using %s in labels and tags", (text, query) => {
    const labelMatch: FrimousseEmoji = {
      emoji: "😀",
      category: 1,
      version: 1,
      label: text,
      tags: [],
    };
    const tagMatch: FrimousseEmoji = {
      ...labelMatch,
      emoji: "😃",
      label: "unrelated",
      tags: [text],
    };

    // Label matches retain their higher rank, and display text is unchanged.
    expect(searchEmojis([tagMatch, labelMatch], query)).toEqual([
      labelMatch,
      tagMatch,
    ]);
    expect(labelMatch.label).toBe(text);
    expect(tagMatch.tags).toEqual([text]);
  });
});
