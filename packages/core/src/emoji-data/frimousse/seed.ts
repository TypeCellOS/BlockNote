import type { FrimousseEmojiData } from "./types.js";
import { loadFrimousseData } from "./loadFrimousseData.js";

// Frimousse localStorage/sessionStorage keys (from frimousse source)
const LOCAL_DATA_KEY = (locale: string) => `frimousse/data/${locale}`;
const SESSION_METADATA_KEY = "frimousse/metadata";

function setStorage(storage: Storage, key: string, value: unknown) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — silently skip
  }
}

function getHighestEmojiVersion(data: FrimousseEmojiData): number {
  let max = 0;
  for (const emoji of data.emojis) {
    if (emoji.version > max) {
      max = emoji.version;
    }
  }
  return max;
}

/**
 * Pre-populates Frimousse's localStorage and sessionStorage caches with
 * data from @blocknote/core/emoji-data. When Frimousse finds valid cached data,
 * it skips its CDN fetch entirely — zero network dependency.
 *
 * Returns the locale the data was actually seeded under. This can differ from
 * the requested `locale` when an alias or fallback was applied (e.g. `no` →
 * `nb`), and is the value that must be passed to Frimousse's `locale` prop so
 * that its cache lookup key matches the seeded entry.
 */
export async function seedFrimousseCache(locale: string): Promise<string> {
  const data = await loadFrimousseData(locale);
  const resolvedLocale = data.locale;

  // Frimousse's LocalData format
  setStorage(localStorage, LOCAL_DATA_KEY(resolvedLocale), {
    data,
    metadata: {
      emojisEtag: "blocknote-seeded",
      messagesEtag: "blocknote-seeded",
    },
  });

  // Frimousse's SessionMetadata format
  setStorage(sessionStorage, SESSION_METADATA_KEY, {
    emojiVersion: getHighestEmojiVersion(data),
    countryFlags: true,
  });

  return resolvedLocale;
}
