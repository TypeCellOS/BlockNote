import { anchoredMatch } from "../util/sequence/index.js";

/**
 * The size of the text that `a[aIndex]` and `b[bIndex]` have in common.
 *
 * @internal
 */
export type Overlap = { aIndex: number; bIndex: number; size: number };

/** Words, and single characters that are not words and not whitespace. */
const TOKEN = /[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu;
const WORD = /^[\p{L}\p{N}_]/u;

/**
 * Returns the size of the text that each pair of texts has in common. The
 * function diffs the words of all texts of `a` against the words of all texts
 * of `b` (see `anchoredMatch`, which also works for large changes). Then it
 * counts, for each pair, the characters of the words that the diff keeps
 * together. Characters that are not words do not count.
 *
 * Example:
 *
 *     a:  Buy milk | Call the bank now
 *     b:  Buy oat milk | Call the bank
 *
 *     [{ aIndex: 0, bIndex: 0, size: 7 }, { aIndex: 1, bIndex: 1, size: 11 }]
 *
 * "buy" and "milk" have 7 characters. "call", "the" and "bank" have 11.
 *
 * Because one diff aligns the full sequences, the result does not cross: a
 * text can only share words with texts at the same position or later.
 *
 * @internal
 */
export function textOverlaps(
  a: readonly string[],
  b: readonly string[],
): Overlap[] {
  const tokensA = a.flatMap(tokensOf);
  const tokensB = b.flatMap(tokensOf);
  // The pairs are in order, and the tokens of a text are next to each other.
  // Thus, the pairs of two texts come one after the other: a pair with other
  // texts than the last overlap starts a new overlap.
  const overlaps: Overlap[] = [];
  for (const pair of anchoredMatch(tokensA, tokensB, (token) => token.key)) {
    const x = tokensA[pair.aIndex];
    const y = tokensB[pair.bIndex];
    if (x.size === 0) {
      continue;
    }
    const last = overlaps.at(-1);
    if (last?.aIndex === x.owner && last.bIndex === y.owner) {
      last.size += x.size;
    } else {
      overlaps.push({ aIndex: x.owner, bIndex: y.owner, size: x.size });
    }
  }
  return overlaps;
}

/**
 * Returns the number of word characters in the text.
 *
 * Examples: "Hello, world!" gives 10. "---" gives 0.
 *
 * @internal
 */
export function wordSize(text: string): number {
  return tokensOf(text, 0).reduce((sum, token) => sum + token.size, 0);
}

/** A token of the text `owner`. `size` is its number of word characters. */
type Token = { key: string; size: number; owner: number };

/**
 * Splits a text into tokens: its words, its single other characters (with
 * the size 0: two texts with only the same punctuation are not the same
 * text), and a separator at its end (the key "", with the size 0).
 *
 * Example, with each token as (key, size):
 *
 *     "Hi, you":  ("hi", 2) (",", 0) ("you", 3) ("", 0)
 */
function tokensOf(text: string, owner: number): Token[] {
  const tokens = Array.from(text.toLowerCase().matchAll(TOKEN), ([token]) => ({
    key: token,
    size: WORD.test(token) ? token.length : 0,
    owner,
  }));
  return [...tokens, { key: "", size: 0, owner }];
}
