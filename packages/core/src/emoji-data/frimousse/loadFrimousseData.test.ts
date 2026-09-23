import { describe, expect, it } from "vite-plus/test";

import { loadFrimousseData } from "./loadFrimousseData.js";

describe("localized emoji data", () => {
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
