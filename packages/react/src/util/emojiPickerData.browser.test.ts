import { expect, it, vi } from "vite-plus/test";

import { resolveBlockNoteEmojiData } from "./emojiPickerData.js";

async function loadEnglishEmojis() {
  const { loadFrimousseData } = await import("@blocknote/core/emoji-data");
  const { emojis } = await loadFrimousseData("en");
  return emojis;
}

it("reuses one canvas for version and flag probes", async () => {
  const emojis = await loadEnglishEmojis();
  const versions = [...new Set(emojis.map(({ version }) => version))].sort(
    (a, b) => b - a,
  );
  expect(versions.length).toBeGreaterThan(1);
  const versionProbes = versions.map(
    (version) => emojis.find((emoji) => emoji.version === version)!.emoji,
  );
  const oldestVersion = versions.at(-1)!;
  const oldestProbe = versionProbes.at(-1)!;
  expect(oldestProbe).not.toBe("🇪🇺");

  const prototype = CanvasRenderingContext2D.prototype;
  // oxlint-disable-next-line typescript/unbound-method -- Forwarded with the real context below.
  const originalMeasureText = prototype.measureText;
  const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext");
  const measureText = vi
    .spyOn(prototype, "measureText")
    .mockImplementation(function (this: CanvasRenderingContext2D, emoji) {
      // Make platform fonts irrelevant: only the oldest probe passes.
      return originalMeasureText.call(
        this,
        emoji === oldestProbe ? "" : "MMMMMMMM",
      );
    });
  const readPixels = vi
    .spyOn(prototype, "getImageData")
    .mockImplementation(() => new ImageData(2, 2));

  try {
    const resolved = await resolveBlockNoteEmojiData("en");

    expect(resolved.emojis.map(({ emoji }) => emoji)).toEqual(
      emojis
        .filter(
          ({ version, countryFlag }) =>
            version === oldestVersion && !countryFlag,
        )
        .map(({ emoji }) => emoji),
    );
    expect(measureText.mock.calls.flat()).toEqual(["🇪🇺", ...versionProbes]);
    expect(getContext).toHaveBeenCalledOnce();
  } finally {
    readPixels.mockRestore();
    measureText.mockRestore();
    getContext.mockRestore();
  }
});

it("preserves the highest-version fallback without flags when canvas is unavailable", async () => {
  const emojis = await loadEnglishEmojis();
  expect(emojis.some(({ countryFlag }) => countryFlag)).toBe(true);
  const getContext = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockReturnValue(null);

  try {
    const resolved = await resolveBlockNoteEmojiData("en");

    expect(resolved.emojis.map(({ emoji }) => emoji)).toEqual(
      emojis
        .filter(({ countryFlag }) => !countryFlag)
        .map(({ emoji }) => emoji),
    );
  } finally {
    getContext.mockRestore();
  }
});
