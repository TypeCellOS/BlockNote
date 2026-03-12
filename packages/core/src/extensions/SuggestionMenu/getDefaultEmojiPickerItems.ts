import type { CompactEmoji, Locale } from "emojibase";

import { defaultInlineContentSchema } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import { DefaultGridSuggestionItem } from "./DefaultGridSuggestionItem.js";

/**
 * Supported emojibase locales for emoji search.
 * See https://emojibase.dev/docs/datasets for the full list.
 */
export type EmojiLocale = Locale;

// Static import map so bundlers can resolve and code-split each locale.
// Dynamic template-literal imports (e.g. import(`emojibase-data/${locale}/...`))
// produce bare module specifiers that browsers can't resolve at runtime.
const emojiDataLoaders: Record<
  string,
  () => Promise<{ default: CompactEmoji[] }>
> = {
  bn: () => import("emojibase-data/bn/compact.json"),
  da: () => import("emojibase-data/da/compact.json"),
  de: () => import("emojibase-data/de/compact.json"),
  en: () => import("emojibase-data/en/compact.json"),
  "en-gb": () => import("emojibase-data/en-gb/compact.json"),
  es: () => import("emojibase-data/es/compact.json"),
  "es-mx": () => import("emojibase-data/es-mx/compact.json"),
  et: () => import("emojibase-data/et/compact.json"),
  fi: () => import("emojibase-data/fi/compact.json"),
  fr: () => import("emojibase-data/fr/compact.json"),
  hi: () => import("emojibase-data/hi/compact.json"),
  hu: () => import("emojibase-data/hu/compact.json"),
  it: () => import("emojibase-data/it/compact.json"),
  ja: () => import("emojibase-data/ja/compact.json"),
  ko: () => import("emojibase-data/ko/compact.json"),
  lt: () => import("emojibase-data/lt/compact.json"),
  ms: () => import("emojibase-data/ms/compact.json"),
  nb: () => import("emojibase-data/nb/compact.json"),
  nl: () => import("emojibase-data/nl/compact.json"),
  pl: () => import("emojibase-data/pl/compact.json"),
  pt: () => import("emojibase-data/pt/compact.json"),
  ru: () => import("emojibase-data/ru/compact.json"),
  sv: () => import("emojibase-data/sv/compact.json"),
  th: () => import("emojibase-data/th/compact.json"),
  uk: () => import("emojibase-data/uk/compact.json"),
  vi: () => import("emojibase-data/vi/compact.json"),
  zh: () => import("emojibase-data/zh/compact.json"),
  "zh-hant": () => import("emojibase-data/zh-hant/compact.json"),
};

// Cache loaded emoji data per locale
const emojiDataCache = new Map<string, Promise<CompactEmoji[]>>();

async function loadEmojiData(locale: EmojiLocale): Promise<CompactEmoji[]> {
  const cached = emojiDataCache.get(locale);
  if (cached) {
    return cached;
  }

  const loader = emojiDataLoaders[locale];
  if (!loader) {
    throw new Error(`Unsupported emoji locale: ${locale}`);
  }

  const promise = (async () => {
    const module = await loader();
    const data: CompactEmoji[] = "default" in module ? module.default : module;

    // Filter to only displayable emojis and sort by order
    return data
      .filter((e) => e.order != null && e.group != null)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  })();

  emojiDataCache.set(locale, promise);
  return promise;
}

function searchEmojis(emojis: CompactEmoji[], query: string): CompactEmoji[] {
  const lowerQuery = query.toLowerCase();

  return emojis.filter((emoji) => {
    // Search in label
    if (emoji.label.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    // Search in tags
    if (emoji.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))) {
      return true;
    }
    return false;
  });
}

/**
 * Search across multiple locales and return deduplicated results.
 * The primary locale results come first, followed by any additional
 * matches from fallback locales.
 */
async function searchEmojisMultiLocale(
  query: string,
  locales: EmojiLocale[],
): Promise<CompactEmoji[]> {
  const allData = await Promise.all(locales.map((l) => loadEmojiData(l)));

  const seen = new Set<string>();
  const results: CompactEmoji[] = [];

  for (const emojis of allData) {
    for (const emoji of searchEmojis(emojis, query)) {
      if (!seen.has(emoji.unicode)) {
        seen.add(emoji.unicode);
        results.push(emoji);
      }
    }
  }

  return results;
}

export async function getDefaultEmojiPickerItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  query: string,
  locale: EmojiLocale = "en",
): Promise<DefaultGridSuggestionItem[]> {
  if (
    !("text" in editor.schema.inlineContentSchema) ||
    editor.schema.inlineContentSchema["text"] !==
      defaultInlineContentSchema["text"]
  ) {
    return [];
  }

  // For empty query, show all emojis from the primary locale
  if (query.trim() === "") {
    const emojis = await loadEmojiData(locale);
    return emojis.map((emoji) => ({
      id: emoji.unicode,
      onItemClick: () => editor.insertInlineContent(emoji.unicode + " "),
    }));
  }

  // For search, search both the primary locale and English (as fallback)
  // so "smile" still works when locale is "fr", and "soleil" also works
  const locales: EmojiLocale[] =
    locale === "en" ? ["en"] : [locale, "en"];

  const emojisToShow = await searchEmojisMultiLocale(query, locales);

  return emojisToShow.map((emoji) => ({
    id: emoji.unicode,
    onItemClick: () => editor.insertInlineContent(emoji.unicode + " "),
  }));
}
