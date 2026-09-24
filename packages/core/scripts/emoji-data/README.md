# Emoji data representation

Regenerate with `pnpm --filter @blocknote/core generate-emoji-data`.

The picker loads one locale chunk on demand. Each locale stores its metadata,
then one label and optional pipe-separated tag list per emoji, in the same order
as `frimousse/common.ts`. Omit the tab when there are no tags. Keep exports
annotated as `string`: otherwise declaration emit repeats the entire dataset as
string literal types in the published `.d.ts` files.

The shared data stores emoji identities, categories, versions, country-flag
markers, and optional skin templates. A template uses `|` for each skin-tone
modifier, including sequences with two modifiers. The loader substitutes each
of the five Unicode modifiers. Generation verifies that all five reconstructed
variants exactly match the upstream data and fails if this assumption changes.

Locale aliases and regional/unsupported locale fallbacks share a cached promise
for their canonical locale. This avoids decoding another 1,906 emoji objects for
each alias or concurrent request; rejected loads are evicted so they can retry.

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
the extra shared chunk. These formats were not adopted. Preserve tag order and
content when evaluating alternatives: search ranking counts matching tags.
