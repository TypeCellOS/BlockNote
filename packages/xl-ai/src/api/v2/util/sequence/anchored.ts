import { gaps } from "./gaps.js";
import { myersMatch, type WorkBudget, workBudgetFor } from "./myers.js";
import type { MatchedPair } from "./types.js";

/**
 * The work of a search for anchors, for each item that it examines. A search
 * puts each key into a map, which takes more time than one step of the Myers
 * diff.
 */
const SEARCH_WORK_PER_ITEM = 10;

/**
 * The maximum size of a gap between two anchors (its items of `a` and of
 * `b`) that gets the Myers diff without a new search for anchors. Its work
 * is at most about the square of this size, and its result is a longest
 * common subsequence. An anchor in a small gap can be unique only by chance.
 */
const SMALL_GAP = 2000;

/**
 * A range of `a` and of `b` to match, or a pair to add to the result. A gap
 * is a range between two anchors. The full input is not a gap.
 */
type Step =
  | {
      kind: "match";
      aStart: number;
      aEnd: number;
      bStart: number;
      bEnd: number;
      isGap: boolean;
    }
  | { kind: "add"; pair: MatchedPair };

/**
 * Matches `a` and `b` like {@link myersMatch}, also for large inputs with
 * many changes (the patience method of git):
 *
 * 1. The keys that are in `a` one time and in `b` one time are anchors. The
 *    longest increasing subsequence of these pairs gives the anchors that do
 *    not cross.
 * 2. A small gap between two anchors (see {@link SMALL_GAP}) gets the Myers
 *    diff. A larger gap gets step 1 again, with only its keys: a key that
 *    repeats in the full input can be unique in a gap. Thus, the gaps become
 *    small. A range without anchors gets the Myers diff.
 *
 * All steps share one work limit (see `workBudgetFor`). Thus, the time is
 * linear, also for inputs that give only one new anchor at each level. After
 * the limit, a gap gets no new search for anchors, and its Myers diff
 * matches only its common prefix and suffix.
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
  const budget = workBudgetFor(a.length + b.length);
  const pairs: MatchedPair[] = [];
  // A stack, not a recursion: an input can give one new anchor at each
  // level, thus the depth can be the size of the input.
  const steps: Step[] = [
    {
      kind: "match",
      aStart: 0,
      aEnd: a.length,
      bStart: 0,
      bEnd: b.length,
      isGap: false,
    },
  ];
  for (let step = steps.pop(); step !== undefined; step = steps.pop()) {
    if (step.kind === "add") {
      pairs.push(step.pair);
    } else {
      const next = matchRange(keysA, keysB, step, budget, pairs);
      for (let i = next.length - 1; i >= 0; i--) {
        steps.push(next[i]);
      }
    }
  }
  return pairs;
}

/**
 * Matches one range. If the range has anchors, returns the steps for its
 * gaps and anchors, in order. Else adds the pairs of the Myers diff to
 * `pairs`, and returns no steps.
 */
function matchRange(
  keysA: readonly string[],
  keysB: readonly string[],
  { aStart, aEnd, bStart, bEnd, isGap }: Extract<Step, { kind: "match" }>,
  budget: WorkBudget,
  pairs: MatchedPair[],
): Step[] {
  const rangeA = keysA.slice(aStart, aEnd);
  const rangeB = keysB.slice(bStart, bEnd);
  if (rangeA.length === 0 || rangeB.length === 0) {
    return [];
  }
  const size = rangeA.length + rangeB.length;
  const search = (!isGap || size > SMALL_GAP) && budget.left > 0;
  if (search) {
    budget.left -= SEARCH_WORK_PER_ITEM * size;
  }
  const anchors = search ? longestIncreasing(uniquePairs(rangeA, rangeB)) : [];
  if (anchors.length === 0) {
    for (const pair of myersMatch(rangeA, rangeB, (x, y) => x === y, budget)) {
      pairs.push({
        aIndex: aStart + pair.aIndex,
        bIndex: bStart + pair.bIndex,
      });
    }
    return [];
  }
  return gaps(anchors, rangeA.length, rangeB.length).flatMap((gap): Step[] => [
    {
      kind: "match",
      aStart: aStart + gap.aStart,
      aEnd: aStart + gap.aEnd,
      bStart: bStart + gap.bStart,
      bEnd: bStart + gap.bEnd,
      isGap: true,
    },
    ...(gap.anchor
      ? [
          {
            kind: "add" as const,
            pair: {
              aIndex: aStart + gap.anchor.aIndex,
              bIndex: bStart + gap.anchor.bIndex,
            },
          },
        ]
      : []),
  ]);
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
