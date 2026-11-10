import { anchoredMatch } from "./anchored.js";
import { myersMatch, type WorkBudget, workBudgetFor } from "./myers.js";
import type { MatchedPair } from "./types.js";

/**
 * A unit of a text for {@link alignText}: a character, or an item that is
 * not text (for example a mention), as one unit. Units with equal keys are
 * equal.
 */
export type TextUnit = { key: string; kind: "word" | "space" | "other" };

const WORD_CHAR = /[\p{L}\p{N}_]/u;
const WHITESPACE_CHAR = /\s/u;

/** Returns the kind of a character (see {@link TextUnit}). */
export function charKind(char: string): TextUnit["kind"] {
  if (WORD_CHAR.test(char)) {
    return "word";
  }
  return WHITESPACE_CHAR.test(char) ? "space" : "other";
}

/**
 * The minimum part of a gap between matched tokens that character matches must
 * cover. If the matches cover less, the alignment does not use them. These
 * characters are the same only by chance, for example in a new sentence. Their
 * old styles and marks must not go to random characters of the new text.
 */
const MIN_GAP_MATCH_RATIO = 0.5;

/**
 * Aligns two texts in two steps:
 *
 * 1. By tokens: words and single other units, without whitespace. Thus, a
 *    word matches at each position, also at the end of the text, and a
 *    changed word is one change.
 * 2. By units, in the gaps between matched tokens. Equal whitespace at the
 *    edges of a gap matches first. Thus, whitespace matches only next to
 *    matched tokens and between matched characters.
 *
 * The merge and the apply use this alignment. Thus, the apply keeps the
 * same characters that the merge keeps.
 *
 * The character diffs of all gaps share one work limit (see
 * `workBudgetFor`). Thus, the time is linear in the size of the texts, also
 * for many large changed gaps.
 *
 * Method: our own design. Step 1 uses the anchored match (the patience method,
 * then Myers, see `anchoredMatch`), and step 2 the Myers diff.
 */
export function alignText(
  a: readonly TextUnit[],
  b: readonly TextUnit[],
): MatchedPair[] {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  // Anchors (tokens that each side has one time) keep the diff fast and
  // exact also for a long block with many changes (see `anchoredMatch`).
  const tokenPairs = anchoredMatch(tokensA, tokensB, (token) => token.key);
  const budget = workBudgetFor(a.length + b.length);

  const pairs: MatchedPair[] = [];
  let aPos = 0;
  let bPos = 0;
  for (const tokenPair of tokenPairs) {
    const tokenA = tokensA[tokenPair.aIndex];
    const tokenB = tokensB[tokenPair.bIndex];
    for (const pair of alignGap(
      a,
      b,
      { aStart: aPos, aEnd: tokenA.start, bStart: bPos, bEnd: tokenB.start },
      budget,
    )) {
      pairs.push(pair);
    }
    for (let k = 0; k < tokenA.end - tokenA.start; k++) {
      pairs.push({ aIndex: tokenA.start + k, bIndex: tokenB.start + k });
    }
    aPos = tokenA.end;
    bPos = tokenB.end;
  }
  for (const pair of alignGap(
    a,
    b,
    { aStart: aPos, aEnd: a.length, bStart: bPos, bEnd: b.length },
    budget,
  )) {
    pairs.push(pair);
  }
  return pairs;
}

/** The units between two matched tokens: `a[aStart, aEnd)` and `b[bStart, bEnd)`. */
type Range = { aStart: number; aEnd: number; bStart: number; bEnd: number };

function alignGap(
  a: readonly TextUnit[],
  b: readonly TextUnit[],
  range: Range,
  budget: WorkBudget,
): MatchedPair[] {
  let { aStart, aEnd, bStart, bEnd } = range;
  // Equal whitespace at the edges of the gap stays with the token next to
  // it. Thus, the space between two changed words is stable, and two writers
  // can change the two words.
  const isSameSpace = (i: number, j: number) =>
    a[i].kind === "space" && a[i].key === b[j].key;
  const before: MatchedPair[] = [];
  while (aStart < aEnd && bStart < bEnd && isSameSpace(aStart, bStart)) {
    before.push({ aIndex: aStart++, bIndex: bStart++ });
  }
  const after: MatchedPair[] = [];
  while (aStart < aEnd && bStart < bEnd && isSameSpace(aEnd - 1, bEnd - 1)) {
    after.unshift({ aIndex: --aEnd, bIndex: --bEnd });
  }
  // The character matches in the rest, if they cover enough of it (see
  // MIN_GAP_MATCH_RATIO).
  const matches = myersMatch(
    a.slice(aStart, aEnd),
    b.slice(bStart, bEnd),
    (x, y) => x.key === y.key,
    budget,
  );
  const rest =
    2 * matches.length < MIN_GAP_MATCH_RATIO * (aEnd - aStart + bEnd - bStart)
      ? []
      : matches.map((pair) => ({
          aIndex: aStart + pair.aIndex,
          bIndex: bStart + pair.bIndex,
        }));
  return [...before, ...rest, ...after];
}

type Token = { start: number; end: number; key: string };

/** Makes tokens: a run of word units, or one other unit. Whitespace is not in a token. */
function tokenize(units: readonly TextUnit[]): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < units.length) {
    const { kind } = units[i];
    let end = i + 1;
    if (kind === "word") {
      while (end < units.length && units[end].kind === "word") {
        end++;
      }
    }
    if (kind !== "space") {
      tokens.push({
        start: i,
        end,
        key: units
          .slice(i, end)
          .map((unit) => unit.key)
          .join(""),
      });
    }
    i = end;
  }
  return tokens;
}
