#!/usr/bin/env node
/**
 * Generates Frimousse-compatible emoji data and locale UI strings from
 * emojibase-data and Unicode CLDR. Run with:
 *   pnpm --filter @blocknote/core generate-emoji-data
 *
 * Build-time only. These packages are devDependencies and do NOT ship at runtime.
 * CLDR 48.2.0 data comes from unicode-org/cldr-json under Unicode-3.0.
 * The generated package data is covered by packages/core/NOTICE.txt.
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(__dirname, "../../src/emoji-data");
const SEARCH_OVERLAYS_DIR = resolve(__dirname, "search-overlays");
const CLDR_ANNOTATIONS_DIR = resolve(
  dirname(require.resolve("cldr-annotations-full/package.json")),
  "annotations",
);
const CLDR_ANNOTATIONS_DERIVED_DIR = resolve(
  dirname(require.resolve("cldr-annotations-derived-full/package.json")),
  "annotationsDerived",
);

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

function loadCldrAnnotations(locale) {
  const annotationsPath = resolve(
    CLDR_ANNOTATIONS_DIR,
    locale,
    "annotations.json",
  );
  const derivedAnnotationsPath = resolve(
    CLDR_ANNOTATIONS_DERIVED_DIR,
    locale,
    "annotations.json",
  );
  const annotations = JSON.parse(readFileSync(annotationsPath, "utf-8"));
  const derivedAnnotations = JSON.parse(
    readFileSync(derivedAnnotationsPath, "utf-8"),
  );
  return (emoji) => {
    const normalizedEmoji = emoji.replace(/[\uFE0E\uFE0F]/g, "");
    return (
      annotations.annotations.annotations[emoji] ??
      annotations.annotations.annotations[normalizedEmoji] ??
      derivedAnnotations.annotationsDerived.annotations[emoji] ??
      derivedAnnotations.annotationsDerived.annotations[normalizedEmoji]
    );
  };
}

// emojibase does not include these locales, so keep their translated metadata
// alongside the search overlays that supplement the English base data.
const EXTRA_LOCALE_METADATA = {
  ar: {
    categories: [
      { index: 0, label: "وجوه ومشاعر" },
      { index: 1, label: "أشخاص وأجسام" },
      { index: 3, label: "حيوانات وطبيعة" },
      { index: 4, label: "طعام وشراب" },
      { index: 5, label: "سفر وأماكن" },
      { index: 6, label: "أنشطة" },
      { index: 7, label: "أشياء" },
      { index: 8, label: "رموز" },
      { index: 9, label: "أعلام" },
    ],
    skinTones: {
      light: "لون بشرة فاتح",
      "medium-light": "لون بشرة فاتح متوسط",
      medium: "لون بشرة متوسط",
      "medium-dark": "لون بشرة داكن متوسط",
      dark: "لون بشرة داكن",
    },
  },
  fa: {
    categories: [
      { index: 0, label: "شکلک‌ها و احساسات" },
      { index: 1, label: "افراد و بدن" },
      { index: 3, label: "حیوانات و طبیعت" },
      { index: 4, label: "غذا و نوشیدنی" },
      { index: 5, label: "سفر و مکان‌ها" },
      { index: 6, label: "فعالیت‌ها" },
      { index: 7, label: "اشیا" },
      { index: 8, label: "نمادها" },
      { index: 9, label: "پرچم‌ها" },
    ],
    skinTones: {
      light: "رنگ پوست روشن",
      "medium-light": "رنگ پوست نسبتاً روشن",
      medium: "رنگ پوست متوسط",
      "medium-dark": "رنگ پوست نسبتاً تیره",
      dark: "رنگ پوست تیره",
    },
  },
  he: {
    categories: [
      { index: 0, label: "סמיילים ורגשות" },
      { index: 1, label: "אנשים וגוף" },
      { index: 3, label: "חיות וטבע" },
      { index: 4, label: "אוכל ושתייה" },
      { index: 5, label: "טיולים ומקומות" },
      { index: 6, label: "פעילויות" },
      { index: 7, label: "חפצים" },
      { index: 8, label: "סמלים" },
      { index: 9, label: "דגלים" },
    ],
    skinTones: {
      light: "גוון עור בהיר",
      "medium-light": "גוון עור בהיר-בינוני",
      medium: "גוון עור בינוני",
      "medium-dark": "גוון עור כהה-בינוני",
      dark: "גוון עור כהה",
    },
  },
  hr: {
    categories: [
      { index: 0, label: "Smajlići i emocije" },
      { index: 1, label: "Osobe i tijelo" },
      { index: 3, label: "Životinje i priroda" },
      { index: 4, label: "Hrana i piće" },
      { index: 5, label: "Putovanja i mjesta" },
      { index: 6, label: "Aktivnosti" },
      { index: 7, label: "Predmeti" },
      { index: 8, label: "Simboli" },
      { index: 9, label: "Zastave" },
    ],
    skinTones: {
      light: "svijetli ton kože",
      "medium-light": "srednje svijetli ton kože",
      medium: "srednji ton kože",
      "medium-dark": "srednje tamni ton kože",
      dark: "tamni ton kože",
    },
  },
  is: {
    categories: [
      { index: 0, label: "Broskallar og tilfinningar" },
      { index: 1, label: "Fólk og líkami" },
      { index: 3, label: "Dýr og náttúra" },
      { index: 4, label: "Matur og drykkur" },
      { index: 5, label: "Ferðalög og staðir" },
      { index: 6, label: "Athafnir" },
      { index: 7, label: "Hlutir" },
      { index: 8, label: "Tákn" },
      { index: 9, label: "Fánar" },
    ],
    skinTones: {
      light: "ljós húðtónn",
      "medium-light": "miðlungs ljós húðtónn",
      medium: "miðlungs húðtónn",
      "medium-dark": "miðlungs dökkur húðtónn",
      dark: "dökkur húðtónn",
    },
  },
  sk: {
    categories: [
      { index: 0, label: "Smajlíky a emócie" },
      { index: 1, label: "Ľudia a telo" },
      { index: 3, label: "Zvieratá a príroda" },
      { index: 4, label: "Jedlo a nápoje" },
      { index: 5, label: "Cestovanie a miesta" },
      { index: 6, label: "Aktivity" },
      { index: 7, label: "Predmety" },
      { index: 8, label: "Symboly" },
      { index: 9, label: "Vlajky" },
    ],
    skinTones: {
      light: "svetlý tón pleti",
      "medium-light": "stredne svetlý tón pleti",
      medium: "stredný tón pleti",
      "medium-dark": "stredne tmavý tón pleti",
      dark: "tmavý tón pleti",
    },
  },
  tr: {
    categories: [
      { index: 0, label: "Suratlar ve Duygular" },
      { index: 1, label: "İnsanlar ve Vücut" },
      { index: 3, label: "Hayvanlar ve Doğa" },
      { index: 4, label: "Yiyecek ve İçecek" },
      { index: 5, label: "Seyahat ve Yerler" },
      { index: 6, label: "Aktivite" },
      { index: 7, label: "Nesneler" },
      { index: 8, label: "Semboller" },
      { index: 9, label: "Bayraklar" },
    ],
    skinTones: {
      light: "açık cilt tonu",
      "medium-light": "orta açık cilt tonu",
      medium: "orta cilt tonu",
      "medium-dark": "orta koyu cilt tonu",
      dark: "koyu cilt tonu",
    },
  },
  uz: {
    categories: [
      { index: 0, label: "Kulgichlar va his-tuyg‘ular" },
      { index: 1, label: "Odamlar va tana" },
      { index: 3, label: "Hayvonlar va tabiat" },
      { index: 4, label: "Ovqat va ichimlik" },
      { index: 5, label: "Sayohat va joylar" },
      { index: 6, label: "Faoliyat" },
      { index: 7, label: "Buyumlar" },
      { index: 8, label: "Belgilar" },
      { index: 9, label: "Bayroqlar" },
    ],
    skinTones: {
      light: "ochiq teri rangi",
      "medium-light": "oʻrtacha ochiq teri rangi",
      medium: "oʻrtacha teri rangi",
      "medium-dark": "oʻrtacha toʻq teri rangi",
      dark: "toʻq teri rangi",
    },
  },
};

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toVarName(locale) {
  return locale.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function decodeHtmlEntities(str) {
  return str.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => {
    switch (entity) {
      case "&amp;":
        return "&";
      case "&lt;":
        return "<";
      case "&gt;":
        return ">";
      case "&quot;":
        return '"';
      case "&#39;":
        return "'";
      default:
        throw new Error(`Unexpected HTML entity: ${entity}`);
    }
  });
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
  const countryFlagSubgroups = new Set(
    messages.subgroups
      .filter(
        (subgroup) =>
          subgroup.key === "country-flag" ||
          subgroup.key === "subdivision-flag",
      )
      .map((subgroup) => subgroup.order),
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
  for (const key of Object.values(TONE_MAP)) {
    const found = messages.skinTones.find((skinTone) => skinTone.key === key);
    if (found) {
      skinTones[key] = capitalize(found.message);
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
    if (countryFlagSubgroups.has(emoji.subgroup)) {
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
    // Handle name\tkeywords, id\tname, and id\tname\tkeywords formats.
    // A few locale exports also contain an English name before the localized name.
    let name, kwStr;
    if (parts.length >= 2 && /^\d+$/.test(parts[0])) {
      name = parts[1];
      kwStr = parts.slice(2).join("\t");
    } else if (
      parts.length >= 3 &&
      /^[\x00-\x7F]+$/.test(parts[0]) &&
      /[^\x00-\x7F]/.test(parts[1])
    ) {
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
    return JSON.parse(`"${dqMatch[1]}"`);
  }

  // Try single-quoted
  const sqMatch = raw.match(/=\s*\n?\s*'((?:[^'\\]|\\.)*)'\s*;?\s*$/s);
  if (sqMatch) {
    return sqMatch[1].replace(/\\(.)/gs, (_, escaped) => {
      if (escaped === "n") {
        return "\n";
      }
      if (escaped === "r") {
        return "\r";
      }
      if (escaped === "t") {
        return "\t";
      }
      return escaped;
    });
  }

  // Try backtick template literal (content is raw, no escaping needed)
  const btMatch = raw.match(/=\s*\n?\s*`([\s\S]*)`\s*;?\s*$/);
  if (btMatch) {
    return btMatch[1];
  }

  return null;
}

function writeFrimousseData(frimousseDir, locale, data) {
  // JSON avoids TS2590 ("union type too complex") on huge inline objects.
  writeFileSync(
    resolve(frimousseDir, `${locale}.json`),
    JSON.stringify(data) + "\n",
  );
  const varName = toVarName(locale) + "FrimousseData";
  writeFileSync(
    resolve(frimousseDir, `${locale}.ts`),
    `import type { FrimousseEmojiData } from "./types.js";\nimport _data from "./${locale}.json" with { type: "json" };\n\nexport const ${varName} = _data as unknown as FrimousseEmojiData;\n`,
  );
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

  // Generate for standard emojibase locales
  for (const locale of EMOJIBASE_LOCALES) {
    const emojis = require(`emojibase-data/${locale}/data.json`);
    const messages = require(`emojibase-data/${locale}/messages.json`);
    const data = buildFrimousseData(emojis, messages, locale);

    writeFrimousseData(frimousseDir, locale, data);
  }

  // Generate for extra locales using English base + search overlays
  for (const locale of EXTRA_LOCALES) {
    const getCldrAnnotation = loadCldrAnnotations(locale);
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
    const metadata = EXTRA_LOCALE_METADATA[locale];
    data.categories = metadata.categories;
    data.skinTones = metadata.skinTones;

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
          emoji.tags = [
            ...new Set([...loc.keywords, ...emoji.tags, ...enEmoji.tags]),
          ];
        }
      }

      const annotation = getCldrAnnotation(emoji.emoji);
      if (annotation?.tts?.[0]) {
        emoji.label = capitalize(annotation.tts[0]);
      }
      if (annotation?.default) {
        emoji.tags = [
          ...new Set([...annotation.default, ...emoji.tags, ...enEmoji.tags]),
        ];
      }
    }

    writeFrimousseData(frimousseDir, locale, data);
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
  skins?: Record<
    "light" | "medium-light" | "medium" | "medium-dark" | "dark",
    string
  >;
}

export interface FrimousseCategory {
  index: number;
  label: string;
}

export interface FrimousseEmojiData {
  locale: string;
  emojis: FrimousseEmoji[];
  categories: FrimousseCategory[];
  skinTones: Record<
    "light" | "medium-light" | "medium" | "medium-dark" | "dark",
    string
  >;
}
`,
  );

  // Write frimousse/index.ts (locale data remains dynamically loaded)
  writeFileSync(
    resolve(frimousseDir, "index.ts"),
    `export type {
  FrimousseEmojiData,
  FrimousseEmoji,
  FrimousseCategory,
} from "./types.js";
export { loadFrimousseData } from "./loadFrimousseData.js";
`,
  );

  console.log(
    `  Generated ${EMOJIBASE_LOCALES.length + EXTRA_LOCALES.length} Frimousse data files + types`,
  );
}

const LOCALE_UI = {
  bn: { search: "অনুসন্ধান", searchNoResults: "কোনো ইমোজি পাওয়া যায়নি" },
  da: { search: "Søg", searchNoResults: "Ingen emoji fundet" },
  de: { search: "Suchen", searchNoResults: "Kein Emoji gefunden" },
  en: { search: "Search", searchNoResults: "No emoji found" },
  "en-gb": { search: "Search", searchNoResults: "No emoji found" },
  es: { search: "Buscar", searchNoResults: "No se encontró ningún emoji" },
  "es-mx": {
    search: "Buscar",
    searchNoResults: "No se encontró ningún emoji",
  },
  et: { search: "Otsi", searchNoResults: "Emotikat ei leitud" },
  fi: { search: "Hae", searchNoResults: "Emojia ei löytynyt" },
  fr: { search: "Rechercher", searchNoResults: "Aucun emoji trouvé" },
  hi: { search: "खोजें", searchNoResults: "कोई इमोजी नहीं मिला" },
  hu: { search: "Keresés", searchNoResults: "Nem található emoji" },
  it: { search: "Cerca", searchNoResults: "Nessuna emoji trovata" },
  ja: { search: "検索", searchNoResults: "絵文字が見つかりません" },
  ko: { search: "검색", searchNoResults: "이모지를 찾을 수 없습니다" },
  lt: { search: "Ieškoti", searchNoResults: "Jaustukų nerasta" },
  ms: { search: "Cari", searchNoResults: "Emoji tidak ditemui" },
  nb: { search: "Søk", searchNoResults: "Ingen emoji funnet" },
  nl: { search: "Zoeken", searchNoResults: "Geen emoji gevonden" },
  pl: { search: "Szukaj", searchNoResults: "Nie znaleziono emoji" },
  pt: { search: "Procurar", searchNoResults: "Nenhum emoji encontrado" },
  ru: { search: "Поиск", searchNoResults: "Эмодзи не найден" },
  sv: { search: "Sök", searchNoResults: "Ingen emoji hittades" },
  th: { search: "ค้นหา", searchNoResults: "ไม่พบอีโมจิ" },
  uk: { search: "Пошук", searchNoResults: "Емодзі не знайдено" },
  vi: {
    search: "Tìm kiếm",
    searchNoResults: "Không tìm thấy biểu tượng cảm xúc",
  },
  zh: { search: "搜索", searchNoResults: "未找到表情符号" },
  "zh-hant": { search: "搜尋", searchNoResults: "找不到表情符號" },
  ar: {
    search: "البحث",
    searchNoResults: "لم يتم العثور على رموز تعبيرية",
  },
  fa: { search: "جستجو", searchNoResults: "ایموجی‌ای پیدا نشد" },
  he: { search: "חיפוש", searchNoResults: "לא נמצא אימוג'י" },
  hr: { search: "Pretraži", searchNoResults: "Emoji nije pronađen" },
  is: { search: "Leita", searchNoResults: "Engin tjákn fundust" },
  sk: { search: "Hľadať", searchNoResults: "Nenašli sa žiadne emoji" },
  tr: { search: "Arama", searchNoResults: "Emoji bulunamadı" },
  uz: { search: "Qidirish", searchNoResults: "Emoji topilmadi" },
};

function generateI18n() {
  console.log("Generating i18n locales...");

  const generatedLocales = [...EMOJIBASE_LOCALES, ...EXTRA_LOCALES].map(
    (locale) => ({
      locale,
      varName: toVarName(locale),
      i18n: LOCALE_UI[locale],
    }),
  );

  const localeExports = generatedLocales.map(
    ({ varName, i18n }) =>
      `export const ${varName}: EmojiI18n = {
  search: ${JSON.stringify(i18n.search)},
  searchNoResults: ${JSON.stringify(i18n.searchNoResults)},
};`,
  );
  const localeMap = generatedLocales.map(
    ({ locale, varName }) =>
      `  ${locale.includes("-") ? JSON.stringify(locale) : locale}: ${varName},`,
  );
  writeFileSync(
    resolve(SRC_DIR, "i18n/locales.ts"),
    `import type { EmojiI18n } from "./dictionary.js";\n\n${localeExports.join("\n")}\n\nexport const emojiLocales = {\n${localeMap.join("\n")}\n} satisfies Record<string, EmojiI18n>;\n`,
  );

  writeFileSync(
    resolve(SRC_DIR, "i18n/index.ts"),
    `export * from "./locales.js";\nexport * from "./dictionary.js";\n`,
  );

  console.log(`  Generated ${generatedLocales.length} locale dictionaries`);
}

function main() {
  generateFrimousseData();
  generateI18n();
  console.log("Done!");
}

main();
