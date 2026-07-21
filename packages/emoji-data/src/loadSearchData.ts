import type { EmojiMartData } from "./data/types.js";

export type SearchOverlay = Record<
  string,
  { name: string; keywords: string[] }
>;

let slugOrder: string[] | undefined;

async function loadSlugOrder(): Promise<string[]> {
  if (slugOrder) {
    return slugOrder;
  }
  const { slugOrder: order } = await import("./search/slugs.js");
  slugOrder = order;
  return slugOrder;
}

async function decodePositional(encoded: string): Promise<SearchOverlay> {
  const slugs = await loadSlugOrder();
  const result: SearchOverlay = {};
  const lines = encoded.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].indexOf("\t");
    if (t <= 0) {
      continue;
    }
    const name = lines[i].substring(0, t);
    const kwStr = lines[i].substring(t + 1);
    result[slugs[i]] = {
      name,
      keywords: kwStr ? kwStr.split("|") : [],
    };
  }
  return result;
}

type SearchModule = Record<string, string>;

const loaders: Record<string, () => Promise<SearchModule>> = {
  ar: () => import("./search/ar.js"),
  bn: () => import("./search/bn.js"),
  da: () => import("./search/da.js"),
  de: () => import("./search/de.js"),
  "en-gb": () => import("./search/en-gb.js"),
  es: () => import("./search/es.js"),
  "es-mx": () => import("./search/es-mx.js"),
  et: () => import("./search/et.js"),
  fa: () => import("./search/fa.js"),
  fi: () => import("./search/fi.js"),
  fr: () => import("./search/fr.js"),
  he: () => import("./search/he.js"),
  hi: () => import("./search/hi.js"),
  hr: () => import("./search/hr.js"),
  hu: () => import("./search/hu.js"),
  is: () => import("./search/is.js"),
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
  sk: () => import("./search/sk.js"),
  sv: () => import("./search/sv.js"),
  th: () => import("./search/th.js"),
  tr: () => import("./search/tr.js"),
  uk: () => import("./search/uk.js"),
  uz: () => import("./search/uz.js"),
  vi: () => import("./search/vi.js"),
  zh: () => import("./search/zh.js"),
  "zh-hant": () => import("./search/zh-hant.js"),
};

const LOCALE_ALIASES: Record<string, string> = {
  no: "nb",
  "zh-tw": "zh-hant",
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

  const resolved = LOCALE_ALIASES[locale] ?? locale;
  const loader = loaders[resolved] ?? loaders[resolved.split("-")[0]];
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

  const overlay = await decodePositional(encoded);
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
