import { myersMatch } from "./myers.js";
import type { MatchedPair } from "./types.js";

/**
 * Matches `a` and `b` like {@link myersMatch}, also for large inputs with
 * many changes (the patience method):
 *
 * 1. The keys that are in `a` one time and in `b` one time are anchors. The
 *    longest increasing subsequence of these pairs gives the anchors that do
 *    not cross.
 * 2. Between the anchors, the function matches again, in the same way. A
 *    range without anchors goes to {@link myersMatch}.
 *
 * Thus, the Myers diff gets small ranges, and the limit of its edit distance
 * applies only inside a range. The result is a common subsequence, in
 * order. It is not always the longest one.
 */
export function anchoredMatch<T>(
  a: readonly T[],
  b: readonly T[],
  keyOf: (item: T) => string,
): MatchedPair[] {
  const pairs: MatchedPair[] = [];
  match(0, a.length, 0, b.length);
  return pairs;

  function match(aStart: number, aEnd: number, bStart: number, bEnd: number) {
    const anchors = uniqueAnchors(aStart, aEnd, bStart, bEnd);
    if (anchors.length === 0) {
      for (const pair of myersMatch(
        a.slice(aStart, aEnd),
        b.slice(bStart, bEnd),
        (x, y) => keyOf(x) === keyOf(y),
      )) {
        pairs.push({
          aIndex: aStart + pair.aIndex,
          bIndex: bStart + pair.bIndex,
        });
      }
      return;
    }
    let aNext = aStart;
    let bNext = bStart;
    for (const anchor of anchors) {
      match(aNext, anchor.aIndex, bNext, anchor.bIndex);
      pairs.push(anchor);
      aNext = anchor.aIndex + 1;
      bNext = anchor.bIndex + 1;
    }
    match(aNext, aEnd, bNext, bEnd);
  }

  /** The anchors of the ranges: pairs of keys that are unique on each side, without crossings. */
  function uniqueAnchors(
    aStart: number,
    aEnd: number,
    bStart: number,
    bEnd: number,
  ): MatchedPair[] {
    const inA = uniqueIndexes(a, aStart, aEnd);
    const inB = uniqueIndexes(b, bStart, bEnd);
    const candidates: MatchedPair[] = [];
    for (const [key, aIndex] of inA) {
      const bIndex = inB.get(key);
      if (aIndex !== undefined && bIndex !== undefined) {
        candidates.push({ aIndex, bIndex });
      }
    }
    candidates.sort((x, y) => x.aIndex - y.aIndex);
    return longestIncreasing(candidates);
  }

  /** The index of each key that is in `items[start, end)` one time. A key that repeats maps to `undefined`. */
  function uniqueIndexes(items: readonly T[], start: number, end: number) {
    const indexes = new Map<string, number | undefined>();
    for (let index = start; index < end; index++) {
      const key = keyOf(items[index]);
      indexes.set(key, indexes.has(key) ? undefined : index);
    }
    return indexes;
  }
}

/** The longest subsequence of the pairs (sorted by `aIndex`) in which `bIndex` increases. */
function longestIncreasing(pairs: readonly MatchedPair[]): MatchedPair[] {
  // `ends[k]` is the index of the pair that ends the best subsequence of length k + 1.
  const ends: number[] = [];
  const previous: number[] = new Array(pairs.length);
  pairs.forEach((pair, index) => {
    let low = 0;
    let high = ends.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (pairs[ends[middle]].bIndex < pair.bIndex) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    previous[index] = low > 0 ? ends[low - 1] : -1;
    ends[low] = index;
  });
  const result: MatchedPair[] = [];
  for (
    let index = ends.length > 0 ? ends[ends.length - 1] : -1;
    index !== -1;
    index = previous[index]
  ) {
    result.push(pairs[index]);
  }
  return result.reverse();
}
