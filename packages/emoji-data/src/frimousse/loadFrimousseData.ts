import type { FrimousseEmojiData } from "./types.js";

type DataModule = Record<string, FrimousseEmojiData>;

const loaders: Record<string, () => Promise<DataModule>> = {
  ar: () => import("./ar.js"),
  bn: () => import("./bn.js"),
  da: () => import("./da.js"),
  de: () => import("./de.js"),
  en: () => import("./en.js"),
  "en-gb": () => import("./en-gb.js"),
  es: () => import("./es.js"),
  "es-mx": () => import("./es-mx.js"),
  et: () => import("./et.js"),
  fa: () => import("./fa.js"),
  fi: () => import("./fi.js"),
  fr: () => import("./fr.js"),
  he: () => import("./he.js"),
  hi: () => import("./hi.js"),
  hr: () => import("./hr.js"),
  hu: () => import("./hu.js"),
  is: () => import("./is.js"),
  it: () => import("./it.js"),
  ja: () => import("./ja.js"),
  ko: () => import("./ko.js"),
  lt: () => import("./lt.js"),
  ms: () => import("./ms.js"),
  nb: () => import("./nb.js"),
  nl: () => import("./nl.js"),
  pl: () => import("./pl.js"),
  pt: () => import("./pt.js"),
  ru: () => import("./ru.js"),
  sk: () => import("./sk.js"),
  sv: () => import("./sv.js"),
  th: () => import("./th.js"),
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

const cache = new Map<string, FrimousseEmojiData>();

export async function loadFrimousseData(
  locale: string,
): Promise<FrimousseEmojiData> {
  const cached = cache.get(locale);
  if (cached) {
    return cached;
  }

  const resolved = LOCALE_ALIASES[locale] ?? locale;
  const loader = loaders[resolved] ?? loaders[resolved.split("-")[0]];
  if (!loader) {
    // Fall back to English
    const enMod = await loaders["en"]();
    const enData = Object.values(enMod)[0];
    return enData;
  }

  const mod = await loader();
  const data = Object.values(mod)[0];
  cache.set(locale, data);
  return data;
}
