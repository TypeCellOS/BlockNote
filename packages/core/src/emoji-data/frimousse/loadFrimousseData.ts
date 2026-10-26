import type { FrimousseEmojiData } from "./types.js";
import { frimousseCategoryIndices, frimousseCommonData } from "./common.js";

type DataModule = { default: string };

const loaders: Record<string, () => Promise<DataModule>> = {
  ar: () => import("./ar.js"),
  de: () => import("./de.js"),
  en: () => import("./en.js"),
  es: () => import("./es.js"),
  fa: () => import("./fa.js"),
  fr: () => import("./fr.js"),
  he: () => import("./he.js"),
  hr: () => import("./hr.js"),
  is: () => import("./is.js"),
  it: () => import("./it.js"),
  ja: () => import("./ja.js"),
  ko: () => import("./ko.js"),
  nb: () => import("./nb.js"),
  nl: () => import("./nl.js"),
  pl: () => import("./pl.js"),
  pt: () => import("./pt.js"),
  ru: () => import("./ru.js"),
  sk: () => import("./sk.js"),
  tr: () => import("./tr.js"),
  uk: () => import("./uk.js"),
  uz: () => import("./uz.js"),
  vi: () => import("./vi.js"),
  zh: () => import("./zh.js"),
  "zh-hant": () => import("./zh-hant.js"),
};

const LOCALE_ALIASES: Record<string, string> = {
  no: "nb",
  "zh-tw": "zh-hant",
};

const cache = new Map<string, Promise<FrimousseEmojiData>>();

const skinToneKeys = [
  "light",
  "medium-light",
  "medium",
  "medium-dark",
  "dark",
] as const;

function decodeFrimousseData(encoded: string): FrimousseEmojiData {
  const [locale, categoryLabels, skinToneLabels, ...localizedEmojis] =
    encoded.split("\n");
  const categoryIndices = frimousseCategoryIndices.split(",").map(Number);
  const commonEmojis = frimousseCommonData.split("\n");

  if (localizedEmojis.length !== commonEmojis.length) {
    throw new Error(`Invalid Frimousse data for locale ${locale}`);
  }

  const skinTones = Object.fromEntries(
    skinToneKeys.map((key, index) => [key, skinToneLabels.split("|")[index]]),
  ) as FrimousseEmojiData["skinTones"];

  return {
    locale,
    categories: categoryLabels.split("|").map((label, index) => ({
      index: categoryIndices[index],
      label,
    })),
    skinTones,
    emojis: commonEmojis.map((common, index) => {
      const [emoji, category, version, countryFlag, encodedSkins] =
        common.split("\t");
      const [label, encodedTags] = localizedEmojis[index].split("\t");
      const skins = encodedSkins
        ? (Object.fromEntries(
            skinToneKeys.map((key, skinIndex) => [
              key,
              encodedSkins.replaceAll(
                "|",
                String.fromCodePoint(0x1f3fb + skinIndex),
              ),
            ]),
          ) as NonNullable<FrimousseEmojiData["emojis"][number]["skins"]>)
        : undefined;

      return {
        emoji,
        category: Number(category),
        version: Number(version),
        label,
        tags: encodedTags ? encodedTags.split("|") : [],
        ...(countryFlag ? { countryFlag: true as const } : {}),
        ...(skins ? { skins } : {}),
      };
    }),
  };
}

export async function loadFrimousseData(
  locale: string,
): Promise<FrimousseEmojiData> {
  const localeParts = locale.toLowerCase().split("-");
  let canonicalLocale = "en";
  // Keep scripts and regional aliases before falling back to the base language.
  // Only own keys are supported locales; arbitrary input must not hit prototypes.
  while (localeParts.length > 0) {
    const candidate = localeParts.join("-");
    const resolved = Object.hasOwn(LOCALE_ALIASES, candidate)
      ? LOCALE_ALIASES[candidate]
      : candidate;
    if (Object.hasOwn(loaders, resolved)) {
      canonicalLocale = resolved;
      break;
    }
    localeParts.pop();
  }
  const cached = cache.get(canonicalLocale);
  if (cached) {
    return cached;
  }

  // Cache the in-flight load too: aliases, fallback locales, and concurrent
  // callers all reuse one decoded corpus.
  const data = loaders[canonicalLocale]()
    .then((mod) => decodeFrimousseData(mod.default))
    .catch((error: unknown) => {
      // Allow retries after an unexpected chunk-loading failure.
      cache.delete(canonicalLocale);
      throw error;
    });
  cache.set(canonicalLocale, data);
  return data;
}
