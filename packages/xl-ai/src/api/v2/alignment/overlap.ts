import { anchoredMatch } from "../util/sequence/index.js";

/** The size of the text that `a[aIndex]` and `b[bIndex]` have in common. */
export type Overlap = { aIndex: number; bIndex: number; size: number };

/**
 * A text for {@link textOverlaps}, with the key of its block. Equal keys are
 * equal blocks (see `alignmentKey`).
 */
export type OverlapText = { text: string; key: string };

/** Words, and single characters that are not words and not whitespace. */
const TOKEN = /[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu;
const WORD = /^[\p{L}\p{N}_]/u;

type Token = { owner: number; key: string; size: number };

/**
 * Returns the size of the text that each pair of texts has in common. The
 * function diffs the words of all texts of `a` against the words of all texts
 * of `b` (see `anchoredMatch`, which also works for large changes). Then it
 * counts, for each pair, the characters of the words that the diff keeps
 * together. Characters that are not words do not count.
 *
 * Because one diff aligns the full sequences, the result does not cross: a
 * text can only share words with texts at the same position or later.
 */
export function textOverlaps(
  a: readonly OverlapText[],
  b: readonly OverlapText[],
): Overlap[] {
  const tokensA = tokensOf(a);
  const tokensB = tokensOf(b);
  const pairs = anchoredMatch(tokensA, tokensB, (token) => token.key);

  // The pairs are in order, and the tokens of a text are next to each other.
  // Thus, the pairs of two texts come one after the other: a pair with other
  // texts than the last overlap starts a new overlap.
  const overlaps: Overlap[] = [];
  for (const pair of pairs) {
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

/** Returns the number of word characters in the text, or 1 for a text without words. */
export function wordSize(text: OverlapText): number {
  return tokensOf([text]).reduce((sum, token) => sum + token.size, 0);
}

/**
 * Splits the texts into tokens:
 *
 * - First a token for the key. If the key is unique, the anchors of the diff
 *   include it (see `anchoredMatch`). Thus, a block with an equal text aligns
 *   as one block, before its words can align with other blocks. A text
 *   without words is only this token, with the size 1. Thus, it overlaps
 *   fully with a text that has the same key (for example an image with the
 *   same URL, or an empty paragraph).
 * - The words and the single other characters. A token that is not a word
 *   has the size 0. Thus, two texts with only the same punctuation are not
 *   the same text.
 * - A separator, with the size 0. Its key is empty, thus no other token has
 *   it: a token of the text has at least one character, and the key token
 *   starts with "\u0001" and has more characters.
 */
function tokensOf(texts: readonly OverlapText[]): Token[] {
  const tokens: Token[] = [];
  texts.forEach(({ text, key }, owner) => {
    const own = Array.from(text.toLowerCase().matchAll(TOKEN), ([token]) => ({
      owner,
      key: token,
      size: WORD.test(token) ? token.length : 0,
    }));
    const hasWords = own.some((token) => token.size > 0);
    tokens.push({ owner, key: `\u0001${key}`, size: hasWords ? 0 : 1 });
    if (hasWords) {
      for (const token of own) {
        tokens.push(token);
      }
    }
    tokens.push({ owner, key: "", size: 0 });
  });
  return tokens;
}
