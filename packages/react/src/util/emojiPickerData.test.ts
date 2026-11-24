import { describe, expect, it, vi } from "vite-plus/test";
import {
  filterEmojiDataForPlatform,
  resolveBlockNoteEmojiData,
} from "./emojiPickerData.js";
import { emojiData } from "./emojiPickerData.test.fixture.js";

vi.mock("@blocknote/core/emoji-data", () => ({
  loadFrimousseData: async () => emojiData,
}));

describe("filterEmojiDataForPlatform", () => {
  it("filters unsupported versions and country flags", () => {
    const filtered = filterEmojiDataForPlatform(emojiData, {
      emojiVersion: 15,
      countryFlags: false,
    });

    expect(filtered.emojis.map((emoji) => emoji.emoji)).toEqual(["😀"]);
    expect(emojiData.emojis).toHaveLength(3);
  });

  it("honors a version override without restoring unsupported flags", () => {
    const filtered = filterEmojiDataForPlatform(
      emojiData,
      { emojiVersion: 15, countryFlags: false },
      16,
    );

    expect(filtered.emojis.map((emoji) => emoji.emoji)).toEqual(["😀", "🫩"]);
  });
});

describe("platform detection", () => {
  it("preserves the highest-version fallback without flags on the server", async () => {
    const resolved = await resolveBlockNoteEmojiData("en");

    expect(resolved.emojis.map((emoji) => emoji.emoji)).toEqual(["😀", "🫩"]);
  });
});
