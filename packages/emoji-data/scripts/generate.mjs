#!/usr/bin/env node
/**
 * Generates an emoji-mart-compatible dataset and per-locale i18n files from
 * emojibase-data. Run with:
 *   pnpm --filter @blocknote/emoji-data generate-emoji-data
 *
 * Build-time only — emojibase-data and @emoji-mart/data are devDependencies
 * and do NOT ship at runtime.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(__dirname, "../src");

// emojibase group → emoji-mart category id
const GROUP_TO_CATEGORY = {
  0: "people", // smileys-emotion
  1: "people", // people-body (merged)
  2: null, // component — EXCLUDE
  3: "nature",
  4: "foods",
  5: "places",
  6: "activity",
  7: "objects",
  8: "symbols",
  9: "flags",
};

const CATEGORY_ORDER = [
  "people",
  "nature",
  "foods",
  "activity",
  "places",
  "objects",
  "symbols",
  "flags",
];

const EMOJIBASE_LOCALES = [
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
];

// Map emojibase group keys → emoji-mart category keys for i18n
const EMOJIBASE_GROUP_TO_CATEGORY_I18N = {
  "smileys-emotion": "people",
  "people-body": "people",
  "animals-nature": "nature",
  "food-drink": "foods",
  activities: "activity",
  "travel-places": "places",
  objects: "objects",
  symbols: "symbols",
  flags: "flags",
};

// emojibase skinTone order → emoji-mart skins key (2..6)
const SKIN_TONE_MAP = {
  light: "2",
  "medium-light": "3",
  medium: "4",
  "medium-dark": "5",
  dark: "6",
};

function toVarName(locale) {
  return locale.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function generateEmojiData() {
  console.log("Generating emoji dataset from emojibase-data/en...");

  const compactEmojis = require("emojibase-data/en/compact.json");
  const shortcodesMap = require("emojibase-data/en/shortcodes/emojibase.json");

  const emojis = {};
  const categoryEmojis = {};
  for (const cat of CATEGORY_ORDER) {
    categoryEmojis[cat] = [];
  }

  const seenSlugs = new Set();

  for (const emoji of compactEmojis) {
    const category = GROUP_TO_CATEGORY[emoji.group];
    if (category === null || category === undefined) {
      continue;
    }

    // Look up shortcode from the separate shortcodes dataset
    let slug;
    const shortcodeEntry = shortcodesMap[emoji.hexcode];
    if (shortcodeEntry) {
      const firstShortcode = Array.isArray(shortcodeEntry)
        ? shortcodeEntry[0]
        : shortcodeEntry;
      slug = firstShortcode.replace(/_/g, "-").toLowerCase();
    } else {
      slug = emoji.hexcode.toLowerCase();
    }

    // Deduplicate
    if (seenSlugs.has(slug)) {
      slug = emoji.hexcode.toLowerCase();
    }
    if (seenSlugs.has(slug)) {
      continue;
    }
    seenSlugs.add(slug);

    const nameWords = new Set(emoji.label.toLowerCase().split(/\s+/));
    const keywords = (emoji.tags || []).filter(
      (t) => !nameWords.has(t.toLowerCase()),
    );

    emojis[slug] = {
      id: slug,
      name: emoji.label,
      keywords,
      skins: [{ native: emoji.unicode }],
    };

    categoryEmojis[category].push(slug);
  }

  const categories = CATEGORY_ORDER.map((id) => ({
    id,
    emojis: categoryEmojis[id],
  }));

  const data = {
    categories,
    emojis,
    aliases: {},
    sheet: { cols: 0, rows: 0 },
  };

  const totalEmojis = Object.keys(emojis).length;
  console.log(`  ${totalEmojis} emojis across ${categories.length} categories`);

  // Write as JSON
  const dataDir = resolve(SRC_DIR, "data");
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(
    resolve(dataDir, "emojiData.json"),
    JSON.stringify(data, null, 2) + "\n",
  );

  // Write types
  writeFileSync(
    resolve(dataDir, "types.ts"),
    `export interface EmojiSkin {
  native: string;
}

export interface Emoji {
  id: string;
  name: string;
  keywords: string[];
  skins: EmojiSkin[];
}

export interface EmojiCategory {
  id: string;
  emojis: string[];
}

export interface EmojiMartData {
  categories: EmojiCategory[];
  emojis: Record<string, Emoji>;
  aliases: Record<string, string>;
  sheet: { cols: number; rows: number };
}
`,
  );

  // Write data index
  writeFileSync(
    resolve(dataDir, "index.ts"),
    `export type {
  Emoji,
  EmojiCategory,
  EmojiMartData,
  EmojiSkin,
} from "./types.js";
import _emojiData from "./emojiData.json" with { type: "json" };
import type { EmojiMartData } from "./types.js";

export const emojiData: EmojiMartData = _emojiData as EmojiMartData;
`,
  );

  console.log(
    "  Wrote src/data/emojiData.json, src/data/types.ts, src/data/index.ts",
  );
  return data;
}

function generateI18n() {
  console.log("Generating i18n locale files...");

  // Load the English emoji-mart i18n as fallback
  const enI18n = require("@emoji-mart/data/i18n/en.json");

  const localesDir = resolve(SRC_DIR, "i18n/locales");
  mkdirSync(localesDir, { recursive: true });

  const availableEmojiMartLocales = new Set();
  // Check which locales @emoji-mart/data has
  for (const loc of EMOJIBASE_LOCALES) {
    try {
      require.resolve(`@emoji-mart/data/i18n/${loc}.json`);
      availableEmojiMartLocales.add(loc);
    } catch {
      // not available
    }
  }

  const generatedLocales = [];

  for (const locale of EMOJIBASE_LOCALES) {
    const varName = toVarName(locale);

    // Load emojibase messages for this locale
    let messages;
    try {
      messages = require(`emojibase-data/${locale}/messages.json`);
    } catch {
      console.warn(`  Warning: no emojibase messages for ${locale}, skipping`);
      continue;
    }

    // Load emoji-mart UI strings (or fallback to English)
    let emojiMartI18n;
    if (availableEmojiMartLocales.has(locale)) {
      emojiMartI18n = require(`@emoji-mart/data/i18n/${locale}.json`);
    } else {
      emojiMartI18n = enI18n;
    }

    // Build category names: emojibase groups for most categories, but prefer
    // emoji-mart's label for "people" (merged from smileys-emotion + people-body)
    const emojibaseCategories = {};
    if (messages.groups) {
      for (const group of messages.groups) {
        const categoryKey = EMOJIBASE_GROUP_TO_CATEGORY_I18N[group.key];
        if (categoryKey && !emojibaseCategories[categoryKey]) {
          emojibaseCategories[categoryKey] = decodeHtmlEntities(group.message);
        }
      }
    }

    const categoryNames = {
      search: emojiMartI18n.categories?.search || enI18n.categories.search,
      frequent:
        emojiMartI18n.categories?.frequent || enI18n.categories.frequent,
      custom: emojiMartI18n.categories?.custom || enI18n.categories.custom,
    };

    for (const catKey of CATEGORY_ORDER) {
      if (catKey === "people") {
        // "people" is a merged category — prefer emoji-mart's polished label
        categoryNames[catKey] =
          emojiMartI18n.categories?.[catKey] ||
          emojibaseCategories[catKey] ||
          enI18n.categories[catKey];
      } else {
        categoryNames[catKey] =
          emojibaseCategories[catKey] ||
          emojiMartI18n.categories?.[catKey] ||
          enI18n.categories[catKey];
      }
    }

    // Build skin tone names
    const skins = {
      choose: emojiMartI18n.skins?.choose || enI18n.skins.choose,
      1: emojiMartI18n.skins?.["1"] || enI18n.skins["1"],
    };

    if (messages.skinTones) {
      for (const tone of messages.skinTones) {
        const skinKey = SKIN_TONE_MAP[tone.key];
        if (skinKey) {
          skins[skinKey] = tone.message;
        }
      }
    }

    // Fill missing skin tones from emoji-mart i18n or English
    for (let i = 2; i <= 6; i++) {
      const key = String(i);
      if (!skins[key]) {
        skins[key] = emojiMartI18n.skins?.[key] || enI18n.skins[key];
      }
    }

    const i18nObj = {
      search: emojiMartI18n.search || enI18n.search,
      search_no_results_1:
        emojiMartI18n.search_no_results_1 || enI18n.search_no_results_1,
      search_no_results_2:
        emojiMartI18n.search_no_results_2 || enI18n.search_no_results_2,
      pick: emojiMartI18n.pick || enI18n.pick,
      add_custom: emojiMartI18n.add_custom || enI18n.add_custom,
      categories: categoryNames,
      skins,
    };

    const content = `import type { EmojiI18n } from "../dictionary.js";\n\nexport const ${varName}: EmojiI18n = ${JSON.stringify(i18nObj, null, 2)};\n`;

    writeFileSync(resolve(localesDir, `${locale}.ts`), content);
    generatedLocales.push({ locale, varName });
  }

  // Write locales/index.ts
  const indexLines = generatedLocales.map(
    ({ locale }) => `export * from "./${locale}.js";`,
  );
  writeFileSync(resolve(localesDir, "index.ts"), indexLines.join("\n") + "\n");

  // Write i18n/index.ts
  writeFileSync(
    resolve(SRC_DIR, "i18n/index.ts"),
    `export * from "./locales/index.js";\nexport * from "./dictionary.js";\n`,
  );

  console.log(
    `  Generated ${generatedLocales.length} locale files + dictionary + index`,
  );
}

function main() {
  generateEmojiData();
  generateI18n();
  console.log("Done!");
}

main();
