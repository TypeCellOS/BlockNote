// @vitest-environment node
import type {
  FrimousseEmoji,
  FrimousseEmojiData,
} from "@blocknote/core/emoji-data";
import { describe, expect, it } from "vite-plus/test";

import {
  EMOJI_PICKER_COLUMNS,
  filterEmojiData,
  getEmojiPickerRows,
  moveEmojiPosition,
} from "./emojiPickerModel.js";

function emoji(index: number, category = 7): FrimousseEmoji {
  return {
    emoji: `emoji-${index}`,
    category,
    version: 1,
    label: `Emoji ${index}`,
    tags: [],
  };
}

function data(emojis: FrimousseEmoji[]): FrimousseEmojiData {
  return {
    locale: "fr",
    emojis,
    categories: [
      { index: 2, label: "Empty category" },
      { index: 7, label: "First category" },
      { index: 4, label: "Second category" },
    ],
    skinTones: {
      light: "Light",
      "medium-light": "Medium light",
      medium: "Medium",
      "medium-dark": "Medium dark",
      dark: "Dark",
    },
  };
}

describe("emoji picker model", () => {
  it("preserves category and within-category order, skipping empty categories and keeping partial rows", () => {
    const first = Array.from({ length: EMOJI_PICKER_COLUMNS + 2 }, (_, index) =>
      emoji(index),
    );
    const second = [emoji(50, 4), emoji(51, 4)];
    const rows = getEmojiPickerRows(data([second[0], ...first, second[1]]));

    expect(rows).toEqual([
      { categoryIndex: 0, emojis: first.slice(0, EMOJI_PICKER_COLUMNS) },
      { categoryIndex: 0, emojis: first.slice(EMOJI_PICKER_COLUMNS) },
      { categoryIndex: 1, emojis: second },
    ]);
    expect(getEmojiPickerRows(data([]))).toEqual([]);
  });

  it("filters and ranks without changing display labels or the source corpus", () => {
    const tagMatch = { ...emoji(0), tags: ["café"] };
    const labelMatch = { ...emoji(1), label: "Café" };
    const unrelated = emoji(2, 4);
    const source = data([tagMatch, unrelated, labelMatch]);
    const filtered = filterEmojiData(source, "CAFÉ");

    expect(filtered.emojis).toEqual([labelMatch, tagMatch]);
    expect(filtered.emojis[0]).toBe(labelMatch);
    expect(filtered.emojis[0].label).toBe("Café");
    expect(filtered.categories).toBe(source.categories);
    expect(filtered.skinTones).toBe(source.skinTones);
    expect(source.emojis).toEqual([tagMatch, unrelated, labelMatch]);
    expect(filterEmojiData(source, "").emojis).toBe(source.emojis);
    expect(filterEmojiData(source, "no match").emojis).toEqual([]);
  });

  it("uses Frimousse's locale-independent casing", () => {
    const dotless = { ...emoji(0), label: "ırmak" };
    const dotted = { ...emoji(1), label: "incir" };
    const source = { ...data([dotless, dotted]), locale: "tr" };

    expect(filterEmojiData(source, "I").emojis).toEqual([dotted]);
    expect(filterEmojiData(source, "i").emojis).toEqual([dotted]);
  });

  const rows = getEmojiPickerRows(
    data(
      Array.from({ length: EMOJI_PICKER_COLUMNS + 2 }, (_, index) =>
        emoji(index),
      ),
    ),
  );

  it.each([
    ["ArrowRight", { row: 0, column: 0 }, { row: 0, column: 1 }],
    ["ArrowLeft", { row: 0, column: 1 }, { row: 0, column: 0 }],
    ["ArrowRight", { row: 0, column: 8 }, { row: 1, column: 0 }],
    ["ArrowLeft", { row: 1, column: 0 }, { row: 0, column: 8 }],
    ["ArrowDown", { row: 0, column: 8 }, { row: 1, column: 1 }],
    ["ArrowUp", { row: 1, column: 1 }, { row: 0, column: 1 }],
  ] as const)("moves %s from %j to %j", (key, from, to) => {
    expect(moveEmojiPosition(from, key, rows)).toEqual(to);
  });

  it.each([
    ["ArrowLeft", { row: 0, column: 0 }],
    ["ArrowUp", { row: 0, column: 0 }],
    ["ArrowRight", { row: 1, column: 1 }],
    ["ArrowDown", { row: 1, column: 1 }],
  ] as const)(
    "preserves position identity at the %s boundary",
    (key, position) => {
      // The editor keeps the key only when navigation returns the same object.
      expect(moveEmojiPosition(position, key, rows)).toBe(position);
    },
  );

  it.each(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"] as const)(
    "preserves position identity for %s when there is no row",
    (key) => {
      const position = { row: 0, column: 0 };
      expect(moveEmojiPosition(position, key, [])).toBe(position);
    },
  );
});
