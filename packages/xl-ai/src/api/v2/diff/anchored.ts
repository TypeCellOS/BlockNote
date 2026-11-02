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
  let aNext = 0;
  let bNext = 0;
  for (const anchor of uniqueAnchors(keysA, keysB)) {
    matchRange(anchor.aIndex, anchor.bIndex);
    pairs.push(anchor);
    aNext = anchor.aIndex + 1;
    bNext = anchor.bIndex + 1;
  }
  matchRange(a.length, b.length);
  return pairs;

  /** Matches the items from the last anchor to the end indexes, with the Myers diff. */
  function matchRange(aEnd: number, bEnd: number) {
    for (const pair of myersMatch(
      keysA.slice(aNext, aEnd),
      keysB.slice(bNext, bEnd),
      (x, y) => x === y,
    )) {
      pairs.push({ aIndex: aNext + pair.aIndex, bIndex: bNext + pair.bIndex });
    }
  }
}

/** The anchors: pairs of keys that are unique on each side, without crossings. */
function uniqueAnchors(
  keysA: readonly string[],
  keysB: readonly string[],
): MatchedPair[] {
  const inB = uniqueIndexes(keysB);
  const candidates: MatchedPair[] = [];
  for (const [key, aIndex] of uniqueIndexes(keysA)) {
    const bIndex = inB.get(key);
    if (aIndex !== undefined && bIndex !== undefined) {
      candidates.push({ aIndex, bIndex });
    }
  }
  // A map keeps the order in which its keys were added. A unique key was
  // added at its only index. Thus, the candidates are in the order of
  // `aIndex`.
  return longestIncreasing(candidates);
}

/** The index of each key that is in `keys` one time. A key that repeats maps to `undefined`. */
function uniqueIndexes(keys: readonly string[]) {
  const indexes = new Map<string, number | undefined>();
  keys.forEach((key, index) => {
    indexes.set(key, indexes.has(key) ? undefined : index);
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
