// @vitest-environment node
import { expect, it } from "vite-plus/test";

// Pure transformations: no generator entry point or translation corpora needed.
import {
  buildFrimousseData,
  compactSearchTags,
  encodeFrimousseCommonData,
  encodeFrimousseData,
  localizeEmoji,
} from "./format.mjs";

it("encodes canonical single/multiple shortcodes once, without changing localized tags", () => {
  const data = buildFrimousseData(
    [
      {
        hexcode: "1F60D",
        emoji: "😍",
        label: "amour",
        group: 0,
        version: 1,
        tags: ["aimer"],
      },
      { hexcode: "1F44D", emoji: "👍️", label: "pouce", group: 0, version: 1 },
      {
        hexcode: "1FAE9",
        emoji: "🫩",
        label: "fatigué",
        group: 0,
        version: 16,
      },
    ],
    {
      groups: [{ order: 0, key: "faces", message: "visages" }],
      subgroups: [],
      skinTones: [],
    },
    "fr",
    { "1F60D": "heart_eyes", "1F44D": ["+1", "thumbsup", "THUMBSUP", ""] },
  );
  expect(encodeFrimousseCommonData(data)).toEqual({
    categoryIndices: "0",
    emojis: "😍\t0\t1\t\t\n👍️\t0\t1\t\t\n🫩\t0\t16\t\t",
    shortcodes: "heart_eyes\n+1|thumbsup\n",
  });
  expect(data.emojis.map(({ tags }) => tags)).toEqual([["aimer"], [], []]);
  expect(encodeFrimousseData(data, data)).toBe(
    "fr\nVisages\n\nAmour\taimer\nPouce\nFatigué",
  );
});

it.each([
  ["IRIS", ["iris", "I", "ISLAND", "island"], ["ISLAND"]],
  ["İRIS", ["iris", "İris"], ["iris"]],
  ["Face", [" face ", "", " HAPPY ", "happy", "smile"], [" HAPPY ", "smile"]],
])("compacts %s with locale-independent casing", (label, tags, expected) => {
  expect(compactSearchTags(label, tags)).toEqual(expected);
});

const commonData = {
  locale: "en",
  categories: [
    { index: 0, label: "Faces" },
    { index: 1, label: "People" },
  ],
  skinTones: {
    light: "Light",
    "medium-light": "Medium light",
    medium: "Medium",
    "medium-dark": "Medium dark",
    dark: "Dark",
  },
  emojis: [
    {
      emoji: "😀",
      label: "Grinning face",
      tags: ["happy", " face ", "happy", "  "],
    },
    { emoji: "👋", label: "Wave", tags: [] },
  ],
};

it("encodes compact positional rows and omits empty tag fields", () => {
  expect(encodeFrimousseData(commonData, commonData)).toBe(
    "en\nFaces|People\nLight|Medium light|Medium|Medium dark|Dark\nGrinning face\thappy\nWave",
  );
});

it("encodes shared flags and skin templates, rejecting nonuniform variants", () => {
  const emoji = {
    emoji: "🧑‍🤝‍🧑",
    category: 1,
    version: 12,
    skins: {
      light: "🧑🏻‍🤝‍🧑🏻",
      "medium-light": "🧑🏼‍🤝‍🧑🏼",
      medium: "🧑🏽‍🤝‍🧑🏽",
      "medium-dark": "🧑🏾‍🤝‍🧑🏾",
      dark: "🧑🏿‍🤝‍🧑🏿",
    },
  };
  const data = {
    ...commonData,
    emojis: [
      emoji,
      { emoji: "🇨🇭", category: 1, version: 1, countryFlag: true },
    ],
  };
  expect(encodeFrimousseCommonData(data)).toEqual({
    categoryIndices: "0,1",
    emojis: "🧑‍🤝‍🧑\t1\t12\t\t🧑|‍🤝‍🧑|\n🇨🇭\t1\t1\t1\t",
    shortcodes: "\n",
  });
  emoji.skins.dark = "invalid";
  expect(() => encodeFrimousseCommonData(data)).toThrow(
    "Cannot encode skin tones",
  );
});

it.each([
  [undefined, undefined, "Grinning face"],
  [{ name: "overlay", keywords: [] }, undefined, "Overlay"],
  [{ name: "overlay", keywords: [] }, { tts: [""] }, "Overlay"],
  [{ name: "overlay", keywords: [] }, { tts: ["istanbul"] }, "İstanbul"],
])(
  "keeps CLDR → overlay → base label precedence",
  (overlay, annotation, label) => {
    expect(
      localizeEmoji(commonData.emojis[0], overlay, annotation, "tr").label,
    ).toBe(label);
  },
);

it("compacts CLDR → overlay → English tags once without mutating the base", () => {
  const overlay = {
    name: "overlay",
    keywords: ["same", "overlay", "HAPPY", " multi  word "],
  };
  const annotation = { tts: ["localized"], default: ["same", "cldr"] };
  const localized = localizeEmoji(
    commonData.emojis[0],
    overlay,
    annotation,
    "en",
  );
  expect(
    encodeFrimousseData(
      {
        ...commonData,
        emojis: [localized, commonData.emojis[1]],
      },
      commonData,
    ),
  ).toBe(
    "en\nFaces|People\nLight|Medium light|Medium|Medium dark|Dark\nLocalized\tsame|cldr|overlay|HAPPY|multi word|face\nWave",
  );
  expect(commonData.emojis[0].label).toBe("Grinning face");
  expect(commonData.emojis[0].tags).toEqual(["happy", " face ", "happy", "  "]);
});

it.each(
  [
    [],
    commonData.categories.slice(0, 1),
    [...commonData.categories].reverse(),
    [...commonData.categories, { index: 2, label: "Extra" }],
  ].map((categories) => ({ categories })),
)("rejects changed category positions", ({ categories }) => {
  expect(() =>
    encodeFrimousseData({ ...commonData, categories }, commonData),
  ).toThrow("Category indices differ for locale en");
});

it.each(
  [
    [],
    commonData.emojis.slice(0, 1),
    [...commonData.emojis].reverse(),
    [...commonData.emojis, commonData.emojis[0]],
    [{ ...commonData.emojis[0], emoji: "😃" }, commonData.emojis[1]],
  ].map((emojis) => ({ emojis })),
)("rejects changed emoji identities or positions", ({ emojis }) => {
  expect(() =>
    encodeFrimousseData({ ...commonData, emojis }, commonData),
  ).toThrow("Emoji order differs for locale en");
});

it("rejects separators in labels instead of corrupting positional data", () => {
  const emojis = [
    { ...commonData.emojis[0], label: "bad\nlabel" },
    commonData.emojis[1],
  ];
  expect(() =>
    encodeFrimousseData({ ...commonData, emojis }, commonData),
  ).toThrow("Cannot encode label");
});
