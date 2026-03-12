import { describe, expect, it } from "vitest";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { getDefaultEmojiPickerItems } from "./getDefaultEmojiPickerItems.js";

/**
 * @vitest-environment jsdom
 */

describe("getDefaultEmojiPickerItems", () => {
  const editor = BlockNoteEditor.create();

  it("should return results for English search terms", async () => {
    const results = await getDefaultEmojiPickerItems(editor, "smile");
    expect(results.length).toBeGreaterThan(0);
    const ids = results.map((r) => r.id);
    expect(ids.some((id) => id.includes("😄") || id.includes("😊"))).toBe(
      true,
    );
  });

  it("should return all emojis for empty query", async () => {
    const results = await getDefaultEmojiPickerItems(editor, "");
    expect(results.length).toBeGreaterThan(100);
  });

  // BLO-922: Search emojis in non-English languages
  it("should return results for French search terms (e.g., 'soleil' for sun)", async () => {
    const results = await getDefaultEmojiPickerItems(editor, "soleil", "fr");
    expect(results.length).toBeGreaterThan(0);
    const ids = results.map((r) => r.id);
    expect(ids.some((id) => id === "☀️" || id === "🌅" || id === "😎")).toBe(
      true,
    );
  });

  it("should return results for German search terms (e.g., 'lächeln' for smile)", async () => {
    const results = await getDefaultEmojiPickerItems(editor, "lächeln", "de");
    expect(results.length).toBeGreaterThan(0);
  });

  it("should return results for Spanish search terms (e.g., 'corazón' for heart)", async () => {
    const results = await getDefaultEmojiPickerItems(editor, "corazón", "es");
    expect(results.length).toBeGreaterThan(0);
    const ids = results.map((r) => r.id);
    expect(ids.some((id) => id === "❤️" || id === "💖" || id === "💗")).toBe(
      true,
    );
  });

  it("should default to English locale", async () => {
    const results = await getDefaultEmojiPickerItems(editor, "heart");
    expect(results.length).toBeGreaterThan(0);
    const ids = results.map((r) => r.id);
    expect(ids.some((id) => id === "❤️" || id === "💖")).toBe(true);
  });

  // Multi-language: English search should work even with non-English locale
  it("should find English terms when locale is French (multi-language fallback)", async () => {
    const results = await getDefaultEmojiPickerItems(editor, "smile", "fr");
    expect(results.length).toBeGreaterThan(0);
    const ids = results.map((r) => r.id);
    expect(ids.some((id) => id.includes("😄") || id.includes("😊"))).toBe(
      true,
    );
  });

  it("should deduplicate results across locales", async () => {
    // "face" should match in both French and English data
    const results = await getDefaultEmojiPickerItems(editor, "face", "fr");
    const ids = results.map((r) => r.id);
    // No duplicates
    expect(ids.length).toBe(new Set(ids).size);
  });
});
