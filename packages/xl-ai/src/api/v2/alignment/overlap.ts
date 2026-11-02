import { anchoredMatch } from "../diff/anchored.js";

/** The size of the text that `a[aIndex]` and `b[bIndex]` have in common. */
export type Overlap = { aIndex: number; bIndex: number; size: number };

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
  a: readonly string[],
  b: readonly string[],
): Overlap[] {
  const tokensA = tokensOf(a);
  const tokensB = tokensOf(b);
  const pairs = anchoredMatch(tokensA, tokensB, (token) => token.key);

  const overlaps = new Map<string, Overlap>();
  for (const pair of pairs) {
    const x = tokensA[pair.aIndex];
    const y = tokensB[pair.bIndex];
    if (x.size === 0) {
      continue;
    }
    const key = `${x.owner}:${y.owner}`;
    const overlap = overlaps.get(key);
    if (overlap) {
      overlap.size += x.size;
    } else {
      overlaps.set(key, { aIndex: x.owner, bIndex: y.owner, size: x.size });
    }
  }
  return [...overlaps.values()];
}

/** Returns the number of word characters in the text. */
export function wordSize(text: string): number {
  return tokensOf([text]).reduce((sum, token) => sum + token.size, 0);
}

/**
 * Splits the texts into tokens, with a separator after each text. The
 * separator and the tokens that are not words have the size 0.
 */
function tokensOf(texts: readonly string[]): Token[] {
  const tokens: Token[] = [];
  texts.forEach((text, owner) => {
    for (const [token] of text.toLowerCase().matchAll(TOKEN)) {
      tokens.push({
        owner,
        key: token,
        size: WORD.test(token) ? token.length : 0,
      });
    }
    tokens.push({ owner, key: "\u0000", size: 0 });
  });
  return tokens;
}
