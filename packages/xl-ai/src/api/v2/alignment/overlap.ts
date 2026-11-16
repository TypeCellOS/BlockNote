import { anchoredMatch, type MatchedPair } from "../util/sequence/index.js";

/**
 * The size of the text that `a[aIndex]` and `b[bIndex]` have in common.
 *
 * @internal
 */
export type Overlap = { aIndex: number; bIndex: number; size: number };

/**
 * A text for {@link textOverlaps}, with the key of its block. Equal keys are
 * equal blocks (see `alignmentKey`).
 *
 * @internal
 */
export type OverlapText = { text: string; key: string };

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
 * Because one diff aligns the full sequences, the result does not cross: a
 * text can only share words with texts at the same position or later.
 *
 * An equal text is a stronger sign than a shared word. Thus, a diff of the
 * keys first finds the equal texts that are in the same order in `a` and in
 * `b` (see {@link equalTextsInOrder}). Such a text is one token in the word
 * diff, with the weight of all its tokens (see {@link diffTokens}). Thus, it
 * is an anchor also if its key is not unique, and one word that two changed
 * texts share cannot align these texts across it. Example: "shared" does
 * not align "Old shared" with "New shared" here, because the two "Same
 * text" have more tokens:
 *
 *     a:  Same text | Same text | Old shared
 *     b:  New shared | Same text | Same text | Other
 *
 * Method: our own design: one diff of the keys and one word diff (the two
 * with `anchoredMatch`), then the sum of the matched word characters for each
 * pair of texts.
 *
 * @internal
 */
export function textOverlaps(
  a: readonly OverlapText[],
  b: readonly OverlapText[],
): Overlap[] {
  const textTokensA = a.map(tokensOfText);
  const textTokensB = b.map(tokensOfText);
  const equal = equalTextsInOrder(
    a,
    b,
    textTokensA.map((tokens) => tokens.length),
  );
  const tokensA = diffTokens(
    textTokensA,
    new Map(equal.map((pair, number) => [pair.aIndex, number])),
  );
  const tokensB = diffTokens(
    textTokensB,
    new Map(equal.map((pair, number) => [pair.bIndex, number])),
  );
  const pairs = anchoredMatch(
    tokensA,
    tokensB,
    (token) => token.key,
    (token) => token.weight,
  );

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

/**
 * Returns the number of word characters in the text, or 1 for a text without words.
 *
 * @internal
 */
export function wordSize(text: OverlapText): number {
  return tokensOfText(text).reduce((sum, token) => sum + token.size, 0);
}

/** A token of a text. `size` is its number of word characters. */
type TextToken = { key: string; size: number };

/**
 * A token of the word diff: a token of the text `owner`, or one token for
 * all tokens of that text. `weight` is the number of tokens of the text
 * that it stands for: its weight as an anchor (see `anchoredMatch`).
 */
type Token = TextToken & { owner: number; weight: number };

/**
 * Splits a text into tokens:
 *
 * - First a token for the key. If the key is unique, the anchors of the diff
 *   include it (see `anchoredMatch`). Thus, a text that moved aligns as one
 *   text. A text without words is only this token, with the size 1. Thus, it
 *   overlaps fully with a text that has the same key (for example an image
 *   with the same URL, or an empty paragraph).
 * - The words and the single other characters. A token that is not a word
 *   has the size 0. Thus, two texts with only the same punctuation are not
 *   the same text.
 * - A separator, with the size 0. Its key is empty, thus no other token has
 *   it: a token of the text has at least one character, and the key token
 *   starts with "\u0001" and has more characters.
 */
function tokensOfText({ text, key }: OverlapText): TextToken[] {
  const words = Array.from(text.toLowerCase().matchAll(TOKEN), ([token]) => ({
    key: token,
    size: WORD.test(token) ? token.length : 0,
  }));
  const hasWords = words.some((token) => token.size > 0);
  return [
    { key: `\u0001${key}`, size: hasWords ? 0 : 1 },
    ...(hasWords ? words : []),
    { key: "", size: 0 },
  ];
}

/**
 * The pairs of texts with equal keys that are in the same order in `a` and
 * in `b`: a diff of the keys (`anchoredMatch`). `weightsA` gives the weight
 * of each text of `a`. If equal texts cross, the texts with the largest
 * weight stay in order.
 *
 * Only a text whose key is in the two lists can have a pair. Thus, the diff
 * gets only these texts: a diff of lists with nothing in common would use
 * its full work limit.
 */
function equalTextsInOrder(
  a: readonly OverlapText[],
  b: readonly OverlapText[],
  weightsA: readonly number[],
): MatchedPair[] {
  const keysA = new Set(a.map((text) => text.key));
  const keysB = new Set(b.map((text) => text.key));
  const inA = a.flatMap(({ key }, index) =>
    keysB.has(key) ? [{ key, index }] : [],
  );
  const inB = b.flatMap(({ key }, index) =>
    keysA.has(key) ? [{ key, index }] : [],
  );
  return anchoredMatch(
    inA,
    inB,
    (text) => text.key,
    (text) => weightsA[text.index],
  ).map((pair) => ({
    aIndex: inA[pair.aIndex].index,
    bIndex: inB[pair.bIndex].index,
  }));
}

/**
 * The tokens of all texts, for the word diff. `equalNumbers` gives the
 * number of each text that has an equal text at the same place in the order
 * of the other list (see {@link textOverlaps}). The two texts have the same
 * number, and the same tokens. Such a text is only one token: its key is
 * that number (after "\u0002"), its size is the sum of the sizes of its
 * tokens, and its weight is the number of its tokens. Thus, only the equal
 * text in the other list has that key: the two tokens are an anchor of the
 * diff, which weighs as much as the anchors of all tokens of the text.
 */
function diffTokens(
  textTokens: readonly TextToken[][],
  equalNumbers: ReadonlyMap<number, number>,
): Token[] {
  return textTokens.flatMap((tokens, owner): Token[] => {
    const equalNumber = equalNumbers.get(owner);
    return equalNumber === undefined
      ? tokens.map((token) => ({ ...token, owner, weight: 1 }))
      : [
          {
            owner,
            key: `\u0002${equalNumber}`,
            size: tokens.reduce((sum, token) => sum + token.size, 0),
            weight: tokens.length,
          },
        ];
  });
}
