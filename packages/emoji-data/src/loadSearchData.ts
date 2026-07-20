import type { EmojiMartData } from "./data/types.js";
import _slugOrder from "./search/slugs.json" with { type: "json" };

const slugOrder: string[] = _slugOrder as string[];

export type SearchOverlay = Record<
  string,
  { name: string; keywords: string[] }
>;

function decodePositional(encoded: string): SearchOverlay {
  const result: SearchOverlay = {};
  const lines = encoded.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].indexOf("\t");
    const name = lines[i].substring(0, t);
    const kwStr = lines[i].substring(t + 1);
    if (!name) {
      continue;
    }
    result[slugOrder[i]] = {
      name,
      keywords: kwStr ? kwStr.split("|") : [],
    };
  }
  return result;
}

type SearchModule = Record<string, string>;

const loaders: Record<string, () => Promise<SearchModule>> = {
  bn: () => import("./search/bn.js"),
  da: () => import("./search/da.js"),
  de: () => import("./search/de.js"),
  "en-gb": () => import("./search/en-gb.js"),
  es: () => import("./search/es.js"),
  "es-mx": () => import("./search/es-mx.js"),
  et: () => import("./search/et.js"),
  fi: () => import("./search/fi.js"),
  fr: () => import("./search/fr.js"),
  hi: () => import("./search/hi.js"),
  hu: () => import("./search/hu.js"),
  it: () => import("./search/it.js"),
  ja: () => import("./search/ja.js"),
  ko: () => import("./search/ko.js"),
  lt: () => import("./search/lt.js"),
  ms: () => import("./search/ms.js"),
  nb: () => import("./search/nb.js"),
  nl: () => import("./search/nl.js"),
  pl: () => import("./search/pl.js"),
  pt: () => import("./search/pt.js"),
  ru: () => import("./search/ru.js"),
  sv: () => import("./search/sv.js"),
  th: () => import("./search/th.js"),
  uk: () => import("./search/uk.js"),
  vi: () => import("./search/vi.js"),
  zh: () => import("./search/zh.js"),
  "zh-hant": () => import("./search/zh-hant.js"),
};

const searchCache = new Map<string, SearchOverlay>();

export async function loadSearchData(
  locale: string,
): Promise<SearchOverlay | undefined> {
  if (locale === "en") {
    return undefined;
  }

  const cached = searchCache.get(locale);
  if (cached) {
    return cached;
  }

  const loader = loaders[locale] ?? loaders[locale.split("-")[0]];
  if (!loader) {
    return undefined;
  }

  const mod = await loader();
  const varName =
    locale.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase()) +
    "SearchData";
  const encoded = mod[varName] ?? Object.values(mod)[0];
  if (typeof encoded !== "string") {
    return undefined;
  }

  const overlay = decodePositional(encoded);
  searchCache.set(locale, overlay);
  return overlay;
}

export function applySearchOverlay(
  baseData: EmojiMartData,
  overlay: SearchOverlay,
): EmojiMartData {
  const localizedEmojis = { ...baseData.emojis };
  for (const [slug, localized] of Object.entries(overlay)) {
    const base = localizedEmojis[slug];
    if (base) {
      localizedEmojis[slug] = {
        ...base,
        name: localized.name,
        keywords: localized.keywords,
      };
    }
  }
  return {
    ...baseData,
    emojis: localizedEmojis,
  };
}
