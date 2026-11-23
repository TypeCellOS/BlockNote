import type { EmojiData } from "frimousse";

export const emojiData: EmojiData = {
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
