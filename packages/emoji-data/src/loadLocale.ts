import type { EmojiI18n } from "./i18n/dictionary.js";

type LocaleModule = Record<string, EmojiI18n>;

const loaders: Record<string, () => Promise<LocaleModule>> = {
  bn: () => import("./i18n/locales/bn.js"),
  da: () => import("./i18n/locales/da.js"),
  de: () => import("./i18n/locales/de.js"),
  en: () => import("./i18n/locales/en.js"),
  "en-gb": () => import("./i18n/locales/en-gb.js"),
  es: () => import("./i18n/locales/es.js"),
  "es-mx": () => import("./i18n/locales/es-mx.js"),
  et: () => import("./i18n/locales/et.js"),
  fi: () => import("./i18n/locales/fi.js"),
  fr: () => import("./i18n/locales/fr.js"),
  hi: () => import("./i18n/locales/hi.js"),
  hu: () => import("./i18n/locales/hu.js"),
  it: () => import("./i18n/locales/it.js"),
  ja: () => import("./i18n/locales/ja.js"),
  ko: () => import("./i18n/locales/ko.js"),
  lt: () => import("./i18n/locales/lt.js"),
  ms: () => import("./i18n/locales/ms.js"),
  nb: () => import("./i18n/locales/nb.js"),
  nl: () => import("./i18n/locales/nl.js"),
  pl: () => import("./i18n/locales/pl.js"),
  pt: () => import("./i18n/locales/pt.js"),
  ru: () => import("./i18n/locales/ru.js"),
  sv: () => import("./i18n/locales/sv.js"),
  th: () => import("./i18n/locales/th.js"),
  uk: () => import("./i18n/locales/uk.js"),
  vi: () => import("./i18n/locales/vi.js"),
  zh: () => import("./i18n/locales/zh.js"),
  "zh-hant": () => import("./i18n/locales/zh-hant.js"),
};

const cache = new Map<string, EmojiI18n>();

export async function loadEmojiLocale(locale: string): Promise<EmojiI18n> {
  const cached = cache.get(locale);
  if (cached) {
    return cached;
  }

  const loader = loaders[locale] ?? loaders[locale.split("-")[0]];
  const mod = await (loader ?? loaders.en)();

  const varName = locale.replace(/-([a-z])/g, (_: string, c: string) =>
    c.toUpperCase(),
  );
  const result = mod[varName] ?? Object.values(mod)[0];
  cache.set(locale, result);
  return result;
}
