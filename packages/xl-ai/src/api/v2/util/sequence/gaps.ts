import type { MatchedPair } from "./types.js";

/**
 * The items between two matched pairs, `a[aStart, aEnd)` and
 * `b[bStart, bEnd)`, and the pair after them (`undefined` after the last
 * pair).
 *
 * @internal
 */
export type Gap = {
  aStart: number;
  aEnd: number;
  bStart: number;
  bEnd: number;
  anchor: MatchedPair | undefined;
};

/**
 * Returns the gaps before, between and after the pairs (in order, without
 * crossings), for lists of the lengths `aLength` and `bLength`. A gap can be
 * empty.
 */
export function gaps(
  pairs: readonly MatchedPair[],
  aLength: number,
  bLength: number,
): Gap[] {
  const result: Gap[] = [];
  let aStart = 0;
  let bStart = 0;
  for (const anchor of pairs) {
    result.push({
      aStart,
      aEnd: anchor.aIndex,
      bStart,
      bEnd: anchor.bIndex,
      anchor,
    });
    aStart = anchor.aIndex + 1;
    bStart = anchor.bIndex + 1;
  }
  result.push({
    aStart,
    aEnd: aLength,
    bStart,
    bEnd: bLength,
    anchor: undefined,
  });
  return result;
}

/** Returns true if the gap has items on one side or on the two sides. */
export function isChanged(gap: Gap): boolean {
  return gap.aEnd > gap.aStart || gap.bEnd > gap.bStart;
}
