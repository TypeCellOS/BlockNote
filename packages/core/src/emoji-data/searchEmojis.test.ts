import { describe, expect, it } from "vite-plus/test";

import type { FrimousseEmoji } from "./frimousse/types.js";
import { searchEmojis } from "./searchEmojis.js";

describe("accent-insensitive emoji search", () => {
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
