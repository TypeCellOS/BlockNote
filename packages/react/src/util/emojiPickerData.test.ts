import type { EmojiData } from "frimousse";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  filterEmojiDataForPlatform,
  resolveBlockNoteEmojiData,
} from "./emojiPickerData.js";

vi.mock("@blocknote/core/emoji-data", () => ({
  loadFrimousseData: async () => data,
}));

afterEach(() => vi.unstubAllGlobals());

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

describe("platform detection", () => {
  it("reuses one canvas for version and flag probes", async () => {
    const context = {
      canvas: { width: 0, height: 0 },
      measureText: vi.fn((emoji: string) => ({
        width: emoji === "😀" ? 2 : 4,
      })),
      fillText: vi.fn(),
      clearRect: vi.fn(),
      getImageData: () => ({ data: new Uint8ClampedArray(16).fill(255) }),
    };
    const getContext = vi.fn(() => context);
    vi.stubGlobal("document", {
      createElement: () => ({ getContext }),
    });

    const resolved = await resolveBlockNoteEmojiData("en");

    expect(resolved.emojis.map((emoji) => emoji.emoji)).toEqual(["😀"]);
    expect(context.measureText.mock.calls.flat()).toEqual(["🇪🇺", "🫩", "😀"]);
    expect(getContext).toHaveBeenCalledOnce();
  });

  it("preserves the highest-version fallback without flags when canvas is unavailable", async () => {
    vi.stubGlobal("document", {
      createElement: () => ({ getContext: () => null }),
    });

    const resolved = await resolveBlockNoteEmojiData("en");

    expect(resolved.emojis.map((emoji) => emoji.emoji)).toEqual(["😀", "🫩"]);
  });
});
