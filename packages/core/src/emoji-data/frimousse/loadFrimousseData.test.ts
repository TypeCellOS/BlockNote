import { describe, expect, it } from "vite-plus/test";

import { loadFrimousseData } from "./loadFrimousseData.js";

describe("localized emoji data", () => {
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
});
