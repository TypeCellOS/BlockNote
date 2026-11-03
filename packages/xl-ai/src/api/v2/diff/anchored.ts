import { gaps } from "./gaps.js";
import { myersMatch } from "./myers.js";
import type { MatchedPair } from "./types.js";

/**
 * Matches `a` and `b` like {@link myersMatch}, also for large inputs with
 * many changes (the patience method):
 *
 * 1. The keys that are in `a` one time and in `b` one time are anchors. The
 *    longest increasing subsequence of these pairs gives the anchors that do
 *    not cross.
 * 2. Between two anchors, {@link myersMatch} matches the items.
 *
 * Thus, the limit of the edit distance of the Myers diff applies only between
 * two anchors. The patience method of git also finds anchors again between
 * two anchors. That is not necessary here: the Myers diff gives the best
 * match between two anchors, unless the range needs more edits than its
 * limit. Without that recursion, the time has a limit, also for inputs that
 * give one new anchor at each level.
 *
 * The result is a common subsequence, in order. It is not always the longest
 * one.
 */
export function anchoredMatch<T>(
  a: readonly T[],
  b: readonly T[],
  keyOf: (item: T) => string,
): MatchedPair[] {
  const keysA = a.map(keyOf);
  const keysB = b.map(keyOf);
  const pairs: MatchedPair[] = [];
  // The anchors: the unique pairs without crossings.
  const anchors = longestIncreasing(uniquePairs(keysA, keysB));
  for (const { aStart, aEnd, bStart, bEnd, anchor } of gaps(
    anchors,
    a.length,
    b.length,
  )) {
    for (const pair of myersMatch(
      keysA.slice(aStart, aEnd),
      keysB.slice(bStart, bEnd),
      (x, y) => x === y,
    )) {
      pairs.push({
        aIndex: aStart + pair.aIndex,
        bIndex: bStart + pair.bIndex,
      });
    }
    if (anchor) {
      pairs.push(anchor);
    }
  }
  return pairs;
}

/**
 * Returns the pairs of equal keys that are in `keysA` one time and in
 * `keysB` one time, in the order of `aIndex`. The pairs can cross. A key
 * `undefined` does not count.
 */
export function uniquePairs(
  keysA: readonly (string | undefined)[],
  keysB: readonly (string | undefined)[],
): MatchedPair[] {
  const inB = uniqueIndexes(keysB);
  const pairs: MatchedPair[] = [];
  // A map keeps the order in which its keys were added. A unique key was
  // added at its only index. Thus, the pairs are in the order of `aIndex`.
  for (const [key, aIndex] of uniqueIndexes(keysA)) {
    const bIndex = inB.get(key);
    if (aIndex !== undefined && bIndex !== undefined) {
      pairs.push({ aIndex, bIndex });
    }
  }
  return pairs;
}

/** The index of each key that is in `keys` one time. A key that repeats maps to `undefined`. */
function uniqueIndexes(keys: readonly (string | undefined)[]) {
  const indexes = new Map<string, number | undefined>();
  keys.forEach((key, index) => {
    if (key !== undefined) {
      indexes.set(key, indexes.has(key) ? undefined : index);
    }
  });
  return indexes;
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
