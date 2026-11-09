// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import { searchEmojis } from "../searchEmojis.js";
import { loadFrimousseData } from "./loadFrimousseData.js";

describe("localized emoji data", () => {
  it.each([
    "ar",
    "de",
    "en",
    "es",
    "fa",
    "fr",
    "he",
    "hr",
    "is",
    "it",
    "ja",
    "ko",
    "nb",
    "nl",
    "pl",
    "pt",
    "ru",
    "sk",
    "tr",
    "uk",
    "uz",
    "vi",
    "zh",
    "zh-hant",
  ])("keeps legacy Emoji Mart shortcodes searchable in %s", async (locale) => {
    const { emojis } = await loadFrimousseData(locale);
    // Both inline search and Frimousse's comment picker search labels and tags.
    // Include single-name mappings, multiple aliases, and presentation selectors.
    for (const [query, identity] of [
      ["heart_eyes", "😍"],
      ["thumbsup", "👍"],
      ["+1", "👍"],
      ["slightly_smiling_face", "🙂"],
      ["hankey", "💩"],
      ["shit", "💩"],
      ["staff_of_aesculapius", "⚕"],
    ]) {
      const matches = emojis.filter((emoji) =>
        [emoji.label, ...emoji.tags].some((value) =>
          value.toLowerCase().includes(query),
        ),
      );
      expect(
        matches.map(({ emoji }) => emoji.replaceAll("\uFE0F", "")),
      ).toContain(identity);
    }
    for (const { tags } of emojis) {
      expect(new Set(tags.map((tag) => tag.toLowerCase())).size).toBe(
        tags.length,
      );
    }
  });

  it("reuses decoded data for concurrent loads, aliases, and fallbacks", async () => {
    const [english, concurrent, regional, fallback, anotherFallback] =
      await Promise.all(
        ["en", "en", "en-US", "unknown", "unsupported"].map(loadFrimousseData),
      );
    for (const data of [concurrent, regional, fallback, anotherFallback]) {
      expect(data).toBe(english);
    }
    expect(await loadFrimousseData("NO")).toBe(await loadFrimousseData("nb"));
    expect(await loadFrimousseData("zh-TW")).toBe(
      await loadFrimousseData("zh-hant"),
    );
  });

  it.each([
    ["no-NO", "nb"],
    ["NO-no-u-nu-latn", "nb"],
    ["zh-Hant-TW", "zh-hant"],
    ["zh-Hant-HK", "zh-hant"],
    ["zh-TW-u-nu-hanidec", "zh-hant"],
  ])(
    "resolves regional aliases and scripts: %s → %s",
    async (locale, canonical) => {
      const data = await loadFrimousseData(locale);
      expect(data.locale).toBe(canonical);
      expect(data).toBe(await loadFrimousseData(canonical));
    },
  );

  it.each(["constructor", "__proto__", "constructor-US"])(
    "falls back to English for inherited object keys: %s",
    async (locale) => {
      expect(await loadFrimousseData(locale)).toBe(
        await loadFrimousseData("en"),
      );
    },
  );

  it("reconstructs skin tones, including sequences with multiple modifiers", async () => {
    const { emojis } = await loadFrimousseData("en");
    expect(emojis.filter((emoji) => emoji.skins)).toHaveLength(323);
    expect(emojis.find((emoji) => emoji.emoji === "👋")?.skins).toEqual({
      light: "👋🏻",
      "medium-light": "👋🏼",
      medium: "👋🏽",
      "medium-dark": "👋🏾",
      dark: "👋🏿",
    });
    expect(emojis.find((emoji) => emoji.emoji === "🧑‍🤝‍🧑")?.skins).toEqual({
      light: "🧑🏻‍🤝‍🧑🏻",
      "medium-light": "🧑🏼‍🤝‍🧑🏼",
      medium: "🧑🏽‍🤝‍🧑🏽",
      "medium-dark": "🧑🏾‍🤝‍🧑🏾",
      dark: "🧑🏿‍🤝‍🧑🏿",
    });
    expect(emojis.find((emoji) => emoji.emoji === "😀")?.skins).toBeUndefined();
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

  it("preserves order for blank searches and matches Turkish dotted I", async () => {
    const turkish = await loadFrimousseData("tr");
    expect(searchEmojis(turkish.emojis, "  ")).toBe(turkish.emojis);
    expect(searchEmojis(turkish.emojis, "isviçre")).toEqual(
      expect.arrayContaining([expect.objectContaining({ emoji: "🇨🇭" })]),
    );
    expect(searchEmojis(turkish.emojis, "ısvıçre")).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ emoji: "🇨🇭" })]),
    );
  });

  it.each(["tr", "TR-tr"])(
    "matches both Turkish I pairs with explicit locale %s",
    async (locale) => {
      const { emojis } = await loadFrimousseData(locale);
      for (const query of ["ışık", "IŞIK"]) {
        expect(searchEmojis(emojis, query, locale)).toEqual(
          expect.arrayContaining([expect.objectContaining({ emoji: "💡" })]),
        );
      }
      for (const query of ["Irak", "IRAK", "ırak"]) {
        expect(searchEmojis(emojis, query, locale)).toEqual(
          expect.arrayContaining([expect.objectContaining({ emoji: "🇮🇶" })]),
        );
      }
      for (const query of ["isviçre", "İSVİÇRE", "I\u0307SVI\u0307ÇRE"]) {
        expect(searchEmojis(emojis, query, locale)).toEqual(
          expect.arrayContaining([expect.objectContaining({ emoji: "🇨🇭" })]),
        );
      }
      expect(searchEmojis(emojis, "ısvıçre", locale)).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ emoji: "🇨🇭" })]),
      );
    },
  );

  it("corrects upstream category and skin-tone translations", async () => {
    const [dutch, japanese, german] = await Promise.all(
      ["nl", "ja", "de"].map(loadFrimousseData),
    );
    expect(dutch.categories.find(({ index }) => index === 1)?.label).toBe(
      "Mensen en lichaam",
    );
    expect(dutch.categories.find(({ index }) => index === 9)?.label).toBe(
      "Vlaggen",
    );
    expect(japanese.categories.find(({ index }) => index === 3)?.label).toBe(
      "動物と自然",
    );
    expect(japanese.categories.find(({ index }) => index === 6)?.label).toBe(
      "アクティビティ",
    );
    expect(german.skinTones["medium-dark"]).toBe("Mitteldunkler Hautton");
  });
});
