#!/usr/bin/env node
/**
 * Generates Frimousse-compatible emoji data and per-locale i18n files from
 * emojibase-data. Run with:
 *   pnpm --filter @blocknote/core generate-emoji-data
 *
 * Build-time only — emojibase-data is a devDependency and does NOT ship at runtime.
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(__dirname, "../../src/emoji-data");
const STATIC_DIR = resolve(__dirname, "../../static");
const SEARCH_OVERLAYS_DIR = resolve(__dirname, "search-overlays");

// Skin tone key mapping: emojibase tone number → Frimousse skin tone key
const TONE_MAP = {
  1: "light",
  2: "medium-light",
  3: "medium",
  4: "medium-dark",
  5: "dark",
};

// Emojibase groups to exclude
const EXCLUDED_GROUPS = new Set([2]); // component

// Locales with full emojibase data
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

// Extra locales without emojibase data — use English base + existing search overlays
const EXTRA_LOCALES = ["ar", "fa", "he", "hr", "is", "sk", "tr", "uz"];

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

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

function getSkinToneVariations(emoji) {
  if (!emoji.skins) {
    return undefined;
  }
  const variations = {};
  for (const skin of emoji.skins) {
    if (typeof skin.tone === "number" && TONE_MAP[skin.tone]) {
      variations[TONE_MAP[skin.tone]] = skin.emoji;
    }
  }
  return Object.keys(variations).length === 5 ? variations : undefined;
}

function buildFrimousseData(emojis, messages, locale) {
  const countryFlagsSubgroup = messages.subgroups.find(
    (s) => s.key === "country-flag" || s.key === "subdivision-flag",
  );

  const filteredGroups = messages.groups.filter((g) => g.key !== "component");
  const filteredEmojis = emojis.filter(
    (e) => "group" in e && !EXCLUDED_GROUPS.has(e.group),
  );

  const categories = filteredGroups.map((g) => ({
    index: g.order,
    label: capitalize(decodeHtmlEntities(g.message)),
  }));

  const skinTones = {};
  for (const st of messages.skinTones) {
    if (TONE_MAP[undefined] !== st.key && st.key in TONE_MAP) {
      // skinTones array uses string keys like "light", "dark"
      skinTones[st.key] = capitalize(st.message);
    }
  }
  // Ensure all skin tone keys are present (emojibase uses key names directly)
  for (const key of Object.values(TONE_MAP)) {
    if (!skinTones[key]) {
      const found = messages.skinTones.find((st) => st.key === key);
      if (found) {
        skinTones[key] = capitalize(found.message);
      }
    }
  }

  const formattedEmojis = filteredEmojis.map((emoji) => {
    const entry = {
      emoji: emoji.emoji,
      category: emoji.group,
      version: emoji.version,
      label: capitalize(emoji.label),
      tags: emoji.tags ?? [],
    };
    if (countryFlagsSubgroup && emoji.subgroup === countryFlagsSubgroup.order) {
      entry.countryFlag = true;
    }
    const skins = getSkinToneVariations(emoji);
    if (skins) {
      entry.skins = skins;
    }
    return entry;
  });

  return {
    locale,
    emojis: formattedEmojis,
    categories,
    skinTones,
  };
}

function decodePositionalSearchData(encoded) {
  const overlay = {};
  const lines = encoded.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split("\t");
    if (parts.length < 2) {
      continue;
    }
    // Handle both 2-part (name\tkeywords) and 3-part (id\tname\tkeywords) formats
    let name, kwStr;
    if (parts.length >= 3 && /^\d+$/.test(parts[0])) {
      name = parts[1];
      kwStr = parts.slice(2).join("\t");
    } else {
      name = parts[0];
      kwStr = parts.slice(1).join("\t");
    }
    if (!name) {
      continue;
    }
    overlay[i] = {
      name,
      keywords: kwStr ? kwStr.split("|") : [],
    };
  }
  return overlay;
}

function readSearchDataFile(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  // Files use single quotes, double quotes, or backtick template literals.
  // Double-quoted strings may span multiple lines with the value on the next line.

  // Try double-quoted (JSON-style escaped string)
  const dqMatch = raw.match(/=\s*\n?\s*"((?:[^"\\]|\\.)*)"\s*;?\s*$/s);
  if (dqMatch) {
    return dqMatch[1].replace(/\\n/g, "\n").replace(/\\t/g, "\t");
  }

  // Try single-quoted
  const sqMatch = raw.match(/=\s*\n?\s*'((?:[^'\\]|\\.)*)'\s*;?\s*$/s);
  if (sqMatch) {
    return sqMatch[1].replace(/\\n/g, "\n").replace(/\\t/g, "\t");
  }

  // Try backtick template literal (content is raw, no escaping needed)
  const btMatch = raw.match(/=\s*\n?\s*`([\s\S]*)`\s*;?\s*$/);
  if (btMatch) {
    return btMatch[1];
  }

  return null;
}

function generateFrimousseData() {
  console.log("Generating Frimousse-format emoji data...");

  const frimousseDir = resolve(SRC_DIR, "frimousse");
  mkdirSync(frimousseDir, { recursive: true });

  // Load English base data (needed for extra locales)
  const enEmojis = require("emojibase-data/en/data.json");
  const enMessages = require("emojibase-data/en/messages.json");

  // Build an index mapping for the English emojis (for extra locale overlay)
  const enFilteredEmojis = enEmojis.filter(
    (e) => "group" in e && !EXCLUDED_GROUPS.has(e.group),
  );

  // Load the canonical slug order for decoding existing search overlays
  const slugsPath = resolve(SEARCH_OVERLAYS_DIR, "slugs.json");
  let canonicalSlugs = [];
  if (existsSync(slugsPath)) {
    canonicalSlugs = JSON.parse(readFileSync(slugsPath, "utf-8"));
  }

  // Build hexcode → English shortcode mapping (for slug correlation)
  const shortcodesMap = require("emojibase-data/en/shortcodes/emojibase.json");
  const hexcodeToSlug = {};
  const seenSlugs = new Set();
  for (const emoji of enEmojis) {
    if (!("group" in emoji) || EXCLUDED_GROUPS.has(emoji.group)) {
      continue;
    }
    const entry = shortcodesMap[emoji.hexcode];
    let slug;
    if (entry) {
      slug = (Array.isArray(entry) ? entry[0] : entry)
        .replace(/_/g, "-")
        .toLowerCase();
    } else {
      slug = emoji.hexcode.toLowerCase();
    }
    if (seenSlugs.has(slug)) {
      slug = emoji.hexcode.toLowerCase();
    }
    if (seenSlugs.has(slug)) {
      continue;
    }
    seenSlugs.add(slug);
    hexcodeToSlug[emoji.hexcode] = slug;
  }

  // Build slug → position in canonical order (for decoding search overlays)
  const slugToCanonicalIndex = {};
  for (let i = 0; i < canonicalSlugs.length; i++) {
    slugToCanonicalIndex[canonicalSlugs[i]] = i;
  }

  // Build hexcode → canonical position
  const hexcodeToCanonicalIndex = {};
  for (const [hex, slug] of Object.entries(hexcodeToSlug)) {
    if (slug in slugToCanonicalIndex) {
      hexcodeToCanonicalIndex[hex] = slugToCanonicalIndex[slug];
    }
  }

  const generatedLocales = [];

  // Generate for standard emojibase locales
  for (const locale of EMOJIBASE_LOCALES) {
    const emojis = require(`emojibase-data/${locale}/data.json`);
    const messages = require(`emojibase-data/${locale}/messages.json`);
    const data = buildFrimousseData(emojis, messages, locale);

    // Write as JSON (avoids TS2590 "union type too complex" on huge inline objects)
    writeFileSync(
      resolve(frimousseDir, `${locale}.json`),
      JSON.stringify(data) + "\n",
    );
    const varName = toVarName(locale) + "FrimousseData";
    writeFileSync(
      resolve(frimousseDir, `${locale}.ts`),
      `import type { FrimousseEmojiData } from "./types.js";\nimport _data from "./${locale}.json" with { type: "json" };\n\nexport const ${varName} = _data as unknown as FrimousseEmojiData;\n`,
    );
    generatedLocales.push({ locale, varName });
  }

  // Generate for extra locales using English base + search overlays
  for (const locale of EXTRA_LOCALES) {
    const searchDataPath = resolve(SEARCH_OVERLAYS_DIR, `${locale}.ts`);
    let overlay = {};

    if (existsSync(searchDataPath)) {
      const encoded = readSearchDataFile(searchDataPath);
      if (encoded) {
        overlay = decodePositionalSearchData(encoded);
      }
    }

    // Start from English base data
    const data = buildFrimousseData(enEmojis, enMessages, locale);

    // Apply localized labels/tags from search overlay
    for (const emoji of data.emojis) {
      // Find this emoji's hexcode to map to canonical position
      const enEmoji = enFilteredEmojis.find((e) => e.emoji === emoji.emoji);
      if (!enEmoji) {
        continue;
      }
      const canonicalIdx = hexcodeToCanonicalIndex[enEmoji.hexcode];
      if (canonicalIdx !== undefined && overlay[canonicalIdx]) {
        const loc = overlay[canonicalIdx];
        if (loc.name) {
          emoji.label = capitalize(loc.name);
        }
        if (loc.keywords.length > 0) {
          emoji.tags = loc.keywords;
        }
      }
    }

    // Try to apply localized category names and skin tones from existing i18n
    const i18nPath = resolve(SRC_DIR, `i18n/locales/${locale}.ts`);
    if (existsSync(i18nPath)) {
      const i18nRaw = readFileSync(i18nPath, "utf-8");
      // Extract category names from the i18n file (keys may or may not be quoted)
      const catMatch = i18nRaw.match(/categories\s*:\s*\{([^}]+)\}/s);
      if (catMatch) {
        const catBlock = catMatch[1];
        const catEntries = {};
        for (const m of catBlock.matchAll(/"?(\w+)"?\s*:\s*"([^"]+)"/g)) {
          catEntries[m[1]] = m[2];
        }
        // Map i18n category keys to Frimousse category indices
        const CATEGORY_KEY_TO_GROUP = {
          people: [0, 1],
          nature: [3],
          foods: [4],
          places: [5],
          activity: [6],
          objects: [7],
          symbols: [8],
          flags: [9],
        };
        for (const cat of data.categories) {
          for (const [key, groups] of Object.entries(CATEGORY_KEY_TO_GROUP)) {
            if (groups.includes(cat.index) && catEntries[key]) {
              cat.label = catEntries[key];
            }
          }
        }
      }

      // Extract skin tone names
      const skinsMatch = i18nRaw.match(/skins\s*:\s*\{([^}]+)\}/s);
      if (skinsMatch) {
        const skinsBlock = skinsMatch[1];
        // Map emoji-mart skin keys (2-6) to Frimousse skin tone keys
        const SKIN_KEY_MAP = {
          2: "light",
          3: "medium-light",
          4: "medium",
          5: "medium-dark",
          6: "dark",
        };
        for (const m of skinsBlock.matchAll(/"?(\d)"?\s*:\s*"([^"]+)"/g)) {
          const fKey = SKIN_KEY_MAP[m[1]];
          if (fKey) {
            data.skinTones[fKey] = m[2];
          }
        }
      }
    }

    writeFileSync(
      resolve(frimousseDir, `${locale}.json`),
      JSON.stringify(data) + "\n",
    );
    const varName = toVarName(locale) + "FrimousseData";
    writeFileSync(
      resolve(frimousseDir, `${locale}.ts`),
      `import type { FrimousseEmojiData } from "./types.js";\nimport _data from "./${locale}.json" with { type: "json" };\n\nexport const ${varName} = _data as unknown as FrimousseEmojiData;\n`,
    );
    generatedLocales.push({ locale, varName });
  }

  // Write types
  writeFileSync(
    resolve(frimousseDir, "types.ts"),
    `export interface FrimousseEmoji {
  emoji: string;
  category: number;
  version: number;
  label: string;
  tags: string[];
  countryFlag?: true;
  skins?: Record<"light" | "medium-light" | "medium" | "medium-dark" | "dark", string>;
}

export interface FrimousseCategory {
  index: number;
  label: string;
}

export interface FrimousseEmojiData {
  locale: string;
  emojis: FrimousseEmoji[];
  categories: FrimousseCategory[];
  skinTones: Record<"light" | "medium-light" | "medium" | "medium-dark" | "dark", string>;
}
`,
  );

  // Write frimousse/index.ts (barrel export for types only — data loaded dynamically)
  writeFileSync(
    resolve(frimousseDir, "index.ts"),
    `export type { FrimousseEmojiData, FrimousseEmoji, FrimousseCategory } from "./types.js";\n`,
  );

  console.log(
    `  Generated ${generatedLocales.length} Frimousse data files + types`,
  );
  return { generatedLocales };
}

// Manually translated UI strings for extra locales (not in emojibase)
const EXTRA_LOCALE_UI = {
  ar: { search: "بحث", searchNoResults: "يا للأسف!" },
  fa: { search: "جستجو", searchNoResults: "افسوس!" },
  he: { search: "חיפוש", searchNoResults: "אוי לא!" },
  hr: { search: "Pretraži", searchNoResults: "Oh ne!" },
  is: { search: "Leita", searchNoResults: "Ó nei!" },
  sk: { search: "Hľadať", searchNoResults: "Ojoj!" },
  tr: { search: "Arama", searchNoResults: "Oh hayır!" },
  uz: { search: "Qidiruv", searchNoResults: "Voy!" },
};

function generateI18n() {
  console.log("Generating i18n locale files...");

  const localesDir = resolve(SRC_DIR, "i18n/locales");
  mkdirSync(localesDir, { recursive: true });

  const EN_FALLBACK = { search: "Search", searchNoResults: "No emoji found" };
  const generatedLocales = [];

  for (const locale of EMOJIBASE_LOCALES) {
    const varName = toVarName(locale);
    const i18nObj = { ...EN_FALLBACK };

    const content = `import type { EmojiI18n } from "../dictionary.js";\n\nexport const ${varName}: EmojiI18n = ${JSON.stringify(i18nObj, null, 2)};\n`;
    writeFileSync(resolve(localesDir, `${locale}.ts`), content);
    generatedLocales.push({ locale, varName });
  }

  for (const locale of EXTRA_LOCALES) {
    const varName = toVarName(locale);
    const i18nObj = EXTRA_LOCALE_UI[locale] ?? EN_FALLBACK;

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

function generateEmojibaseFiles() {
  console.log("Generating emojibase-format static files (for self-hosting)...");

  let count = 0;
  for (const locale of EMOJIBASE_LOCALES) {
    const localeDir = resolve(STATIC_DIR, `emojibase/${locale}`);
    mkdirSync(localeDir, { recursive: true });

    // Copy data.json and messages.json from emojibase-data
    const data = require(`emojibase-data/${locale}/data.json`);
    const messages = require(`emojibase-data/${locale}/messages.json`);

    writeFileSync(resolve(localeDir, "data.json"), JSON.stringify(data) + "\n");
    writeFileSync(
      resolve(localeDir, "messages.json"),
      JSON.stringify(messages) + "\n",
    );
    count++;
  }

  console.log(`  Generated emojibase files for ${count} locales`);
}

function main() {
  generateFrimousseData();
  generateI18n();
  generateEmojibaseFiles();
  console.log("Done!");
}

main();
