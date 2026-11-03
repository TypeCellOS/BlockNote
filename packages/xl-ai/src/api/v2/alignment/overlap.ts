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
  countAll = false,
): Overlap[] {
  const tokensA = tokensOf(a, countAll);
  const tokensB = tokensOf(b, countAll);
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

/** Returns the number of word characters in the text (with `countAll`, of all characters that are not whitespace). */
export function wordSize(text: string, countAll = false): number {
  return tokensOf([text], countAll).reduce((sum, token) => sum + token.size, 0);
}

/**
 * Splits the texts into tokens, with a separator after each text. The
 * separator has the size 0. A token that is not a word has the size 0, also,
 * unless `countAll` is set. The identity rules count only words: two texts
 * with only the same punctuation are not the same text. The links of a view
 * count all characters: the view comes from the document, thus a part of
 * the view with only punctuation (for example "}") comes from a block too.
 */
function tokensOf(texts: readonly string[], countAll: boolean): Token[] {
  const tokens: Token[] = [];
  texts.forEach((text, owner) => {
    for (const [token] of text.toLowerCase().matchAll(TOKEN)) {
      tokens.push({
        owner,
        key: token,
        size: countAll || WORD.test(token) ? token.length : 0,
      });
    }
    tokens.push({ owner, key: "\u0000", size: 0 });
  });
  return tokens;
}
