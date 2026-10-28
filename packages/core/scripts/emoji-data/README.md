# Emoji data representation

Regenerate with `pnpm --filter @blocknote/core generate-emoji-data`.

The runtime contracts in `frimousse/types.ts` are handwritten; generation only
writes data modules, not public types.

Build-time search overlays in `search-overlays/*.json` are keyed by the exact
emoji sequence and contain a fallback `name` and an ordered `keywords` array.
They supplement the English base before CLDR labels and keywords are applied.
Preserve keyword order and content: changing the merge or deduplication order can
affect search ranking. These inputs are not shipped as runtime data.

The picker loads one locale chunk on demand. Each locale stores its metadata,
then one label and optional pipe-separated tag list per emoji, in the same order
as `frimousse/common.ts`. Omit the tab when there are no tags. Keep exports
annotated as `string`: otherwise declaration emit repeats the entire dataset as
string literal types in the published `.d.ts` files.

Each locale module exposes its encoded string as a default export for the loader,
alongside its existing named export. Generation verifies emoji identity/order
against the shared English data before writing positional locale rows.

Search tags are compacted before encoding: empty tags, case-insensitive duplicates,
and tags contained in the label are removed. Compaction uses explicit English
casing for reproducibility, independently of the host locale. Runtime search still
uses the data's locale, as described below.

This compaction is **not ranking-neutral**: search adds a score for every matching
stored tag, including when the label also matches. The checked-in data therefore
defines ranking over the compacted tags, not over the original upstream corpus.
Restoring upstream tag-weighted ranking requires changing the compaction policy
and regenerating all locale modules together; changing only the generator or
search scorer cannot recover the discarded information. Review ranking changes
alongside any such regeneration.

The shared data stores emoji identities, categories, versions, country-flag
markers, and optional skin templates. A template uses `|` for each skin-tone
modifier, including sequences with two modifiers. The loader substitutes each
of the five Unicode modifiers. Generation verifies that all five reconstructed
variants exactly match the upstream data and fails if this assumption changes.

Locale aliases and regional/unsupported locale fallbacks share a cached promise
for their canonical locale. This avoids decoding another 1,906 emoji objects for
each alias or concurrent request; rejected loads are evicted so they can retry.
Fallback removes locale subtags from right to left and resolves aliases at each
step, preserving scripts (`zh-Hant-TW`) and regional aliases (`no-NO`).

Call `searchEmojis(data.emojis, query, data.locale)` for locale-aware casing of
both labels and tags, including any English search aliases in localized data.
The locale is optional and defaults to English. Every language uses
`toLocaleLowerCase`; the locale is normalized to its language once per search.

## Size comparison

Measured with Node's default `gzipSync` on JavaScript string exports (UTF-8 bytes,
without comments or source maps), against the previous five-variant encoding:

| Shared data | Before |  After |
| ----------- | -----: | -----: |
| Raw         | 60,793 | 40,955 |
| Gzip        | 11,364 |  7,367 |
| Brotli      |  6,864 |  5,434 |

The decoder adds a small substitution expression. All languages benefit from
this shared-data reduction. Omitting empty tag fields additionally saves 4,474
raw bytes and 885 gzip bytes across the 24 locale string literals.

Experiments with per-locale tag dictionaries reduced raw locale data by about
17%, but increased gzip size by about 7%. Inverted indexes and sorting rows also
increased gzip size. Sharing tag suffixes across languages reduced aggregate
storage but increased the first-load download for several languages because of
the extra shared chunk. These formats were not adopted. Preserve the current
compacted tag order and content when evaluating encoding-only alternatives:
search ranking counts matching stored tags.
