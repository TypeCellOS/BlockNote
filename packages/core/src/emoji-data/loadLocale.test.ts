import * as blockNoteLocales from "../i18n/locales/index.js";
import { describe, expect, it } from "vite-plus/test";
import { emojiLocales } from "./i18n/locales.js";
import { loadFrimousseData } from "./frimousse/loadFrimousseData.js";
import { loadEmojiLocale } from "./loadLocale.js";

const EXPECTED_EMOJI_LOCALES = [
  "bn",
  "da",
  "de",
  "en",
  "en-gb",
  "es",
  "es-mx",
  "et",
  "fi",
  "fr",
  "hi",
  "hu",
  "it",
  "ja",
  "ko",
  "lt",
  "ms",
  "nb",
  "nl",
  "pl",
  "pt",
  "ru",
  "sv",
  "th",
  "uk",
  "vi",
  "zh",
  "zh-hant",
  "ar",
  "fa",
  "he",
  "hr",
  "is",
  "sk",
  "tr",
  "uz",
] as const;

describe("emoji locale dictionaries", () => {
  it("contains translated picker UI for every emoji locale", () => {
    expect(Object.keys(emojiLocales)).toEqual(EXPECTED_EMOJI_LOCALES);

    for (const locale of EXPECTED_EMOJI_LOCALES) {
      const dictionary = emojiLocales[locale];
      expect(dictionary.search).not.toBe("");
      expect(dictionary.searchNoResults).not.toBe("");
      if (locale !== "en" && locale !== "en-gb") {
        expect(dictionary.search).not.toBe(emojiLocales.en.search);
        expect(dictionary.searchNoResults).not.toBe(
          emojiLocales.en.searchNoResults,
        );
      }
    }
  });

  it("resolves translated picker UI for every exported BlockNote locale", async () => {
    const exportedLocales = Object.values(blockNoteLocales).map(
      (dictionary) => dictionary.locale,
    );
    expect(exportedLocales).toHaveLength(24);

    for (const locale of exportedLocales) {
      expect(locale).toBeTypeOf("string");
      if (!locale) {
        continue;
      }
      const dictionary = await loadEmojiLocale(locale);
      expect(dictionary.search).not.toBe("");
      expect(dictionary.searchNoResults).not.toBe("");
      if (locale !== "en") {
        expect(dictionary.search).not.toBe(emojiLocales.en.search);
        expect(dictionary.searchNoResults).not.toBe(
          emojiLocales.en.searchNoResults,
        );
      }
    }
  });

  it("keeps localized emoji labels and useful search aliases", async () => {
    const turkish = await loadFrimousseData("tr");
    const meltingFace = turkish.emojis.find((emoji) => emoji.emoji === "🫠");

    expect(meltingFace?.label).toBe("Eriyen yüz");
    expect(meltingFace?.tags).toContain("erime");
    expect(meltingFace?.tags).toContain("melt");
    expect(turkish.categories[0]?.label).toBe("Suratlar ve Duygular");
    expect(turkish.categories[1]?.label).toBe("İnsanlar ve Vücut");

    const localizedSamples = await Promise.all(
      ["ar", "fa", "he", "hr", "is", "sk", "tr", "uz"].map((locale) =>
        loadFrimousseData(locale),
      ),
    );
    const english = await loadFrimousseData("en");
    const englishIdentities = english.emojis.map((emoji) => emoji.emoji);
    for (const data of localizedSamples) {
      expect(data.emojis).toHaveLength(1906);
      expect(data.emojis.map((emoji) => emoji.emoji)).toEqual(
        englishIdentities,
      );
    }
    expect(
      localizedSamples.map(
        (data) => data.emojis.find((emoji) => emoji.emoji === "🤤")?.label,
      ),
    ).toEqual([
      "وجه بلعاب سائل",
      "آب افتادن دهان",
      "פרצוף מזיל ריר",
      "Lice koje slini",
      "Slefandi",
      "Slintajúca tvár",
      "Salya akıtan yüz",
      "So‘lagi oqayotgan",
    ]);
  });
});
