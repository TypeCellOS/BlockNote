#!/usr/bin/env node
/**
 * Generates Frimousse-compatible emoji data from emojibase-data and Unicode
 * CLDR. Run with:
 *   pnpm --filter @blocknote/core generate-emoji-data
 *
 * Build-time only. These packages are devDependencies and do NOT ship at runtime.
 * CLDR 48.2.0 data comes from unicode-org/cldr-json under Unicode-3.0.
 * The generated package data is covered by packages/core/NOTICE.txt.
 */

import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import {
  buildFrimousseData,
  encodeFrimousseCommonData,
  encodeFrimousseData,
  localizeEmoji,
} from "./format.mjs";

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

// Locales with full emojibase data
const EMOJIBASE_LOCALES = [
  "de",
  "en",
  "es",
  "fr",
  "it",
  "ja",
  "ko",
  "nb",
  "nl",
  "pl",
  "pt",
  "ru",
  "uk",
  "vi",
  "zh",
  "zh-hant",
];

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

function writeFrimousseCommonData(frimousseDir, data) {
  const { categoryIndices, emojis } = encodeFrimousseCommonData(data);
  writeFileSync(
    resolve(frimousseDir, "common.ts"),
    `// THIS FILE IS AUTO-GENERATED. DO NOT EDIT DIRECTLY.\n// Regenerate with: pnpm --filter @blocknote/core generate-emoji-data\n\nexport const frimousseCategoryIndices: string = ${JSON.stringify(categoryIndices)};\nexport const frimousseCommonData: string = ${JSON.stringify(emojis)};\n`,
  );
}

function writeFrimousseData(frimousseDir, data, commonData) {
  const { locale } = data;
  const encoded = encodeFrimousseData(data, commonData);
  const varName =
    locale.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + "FrimousseData";
  // A type annotation prevents declaration emit from copying the entire corpus
  // into a string literal type in each .d.ts file.
  writeFileSync(
    resolve(frimousseDir, `${locale}.ts`),
    `// THIS FILE IS AUTO-GENERATED. DO NOT EDIT DIRECTLY.\n// Regenerate with: pnpm --filter @blocknote/core generate-emoji-data\n\nexport const ${varName}: string = ${JSON.stringify(encoded)};\nexport { ${varName} as default };\n`,
  );
}

function generateFrimousseData() {
  console.log("Generating Frimousse-format emoji data...");

  const frimousseDir = resolve(SRC_DIR, "frimousse");
  mkdirSync(frimousseDir, { recursive: true });

  // Load English base data (needed for extra locales)
  const enEmojis = require("emojibase-data/en/data.json");
  const enMessages = require("emojibase-data/en/messages.json");
  const commonData = buildFrimousseData(enEmojis, enMessages, "en");
  writeFrimousseCommonData(frimousseDir, commonData);

  // Generate for standard emojibase locales
  for (const locale of EMOJIBASE_LOCALES) {
    const emojis = require(`emojibase-data/${locale}/data.json`);
    const messages = require(`emojibase-data/${locale}/messages.json`);
    const data = buildFrimousseData(emojis, messages, locale);

    writeFrimousseData(frimousseDir, data, commonData);
  }

  // Generate for extra locales using English base + search overlays
  const extraLocales = Object.entries(EXTRA_LOCALE_METADATA);
  for (const [locale, metadata] of extraLocales) {
    const getCldrAnnotation = loadCldrAnnotations(locale);
    const overlay = JSON.parse(
      readFileSync(resolve(SEARCH_OVERLAYS_DIR, `${locale}.json`), "utf-8"),
    );

    // Start from English base data
    const data = buildFrimousseData(enEmojis, enMessages, locale);
    data.categories = metadata.categories;
    data.skinTones = metadata.skinTones;

    data.emojis = data.emojis.map((emoji) =>
      localizeEmoji(
        emoji,
        overlay[emoji.emoji],
        getCldrAnnotation(emoji.emoji),
        locale,
      ),
    );

    writeFrimousseData(frimousseDir, data, commonData);
  }

  console.log(
    `  Generated ${EMOJIBASE_LOCALES.length + extraLocales.length} locale files + shared data`,
  );
}

generateFrimousseData();
console.log("Done!");
