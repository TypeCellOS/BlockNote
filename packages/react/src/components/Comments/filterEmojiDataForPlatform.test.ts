import type { EmojiData } from "frimousse";
import { describe, expect, it } from "vite-plus/test";
import { filterEmojiDataForPlatform } from "./FrimoussePicker.js";

const data: EmojiData = {
  locale: "en",
  emojis: [
    {
      emoji: "😀",
      category: 0,
      version: 1,
      label: "Old emoji",
      tags: [],
    },
    {
      emoji: "🫩",
      category: 0,
      version: 16,
      label: "New emoji",
      tags: [],
    },
    {
      emoji: "🇪🇺",
      category: 0,
      version: 1,
      label: "Flag",
      tags: [],
      countryFlag: true,
    },
  ],
  categories: [{ index: 0, label: "Smileys" }],
  skinTones: {
    light: "Light",
    "medium-light": "Medium light",
    medium: "Medium",
    "medium-dark": "Medium dark",
    dark: "Dark",
  },
};

describe("filterEmojiDataForPlatform", () => {
  it("filters unsupported versions and country flags", () => {
    const filtered = filterEmojiDataForPlatform(data, {
      emojiVersion: 15,
      countryFlags: false,
    });

    expect(filtered.emojis.map((emoji) => emoji.emoji)).toEqual(["😀"]);
    expect(data.emojis).toHaveLength(3);
  });

  it("honors a version override without restoring unsupported flags", () => {
    const filtered = filterEmojiDataForPlatform(
      data,
      { emojiVersion: 15, countryFlags: false },
      16,
    );

    expect(filtered.emojis.map((emoji) => emoji.emoji)).toEqual(["😀", "🫩"]);
  });
});
