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
 * Matches `a` and `b` like {@link myersMatch}, also for large inputs with
 * many changes (the patience method of git):
 *
 * 1. The keys that are in `a` one time and in `b` one time are anchors. Of
 *    these pairs, the longest subsequence that does not cross stays (see
 *    {@link heaviestIncreasing}, with the weight 1 for each pair).
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

/**
 * The subsequence of the pairs (sorted by `aIndex`) in which `bIndex`
 * increases, with the largest sum of weights. Each `bIndex` is less than
 * `bLength`, and no two pairs have the same one. If two subsequences have
 * the same sum, the one that ends at the smaller `bIndex` wins, at each
 * pair of the result. With the weight 1 for each pair, the result is a
 * longest increasing subsequence.
 *
 * Method: the standard dynamic program for the heaviest increasing
 * subsequence, with a Fenwick tree (a binary indexed tree) for the best
 * subsequence that ends before a `bIndex`. The time is O(n log bLength).
 * `anchored.property.test.ts` has the simple version (it compares each pair
 * with each pair before it).
 */
export function heaviestIncreasing<Pair extends MatchedPair>(
  pairs: readonly Pair[],
  weightOf: (pair: Pair) => number,
  bLength: number,
): Pair[] {
  /** The sum of weights of the best subsequence that ends at each pair. */
  const sums = new Array<number>(pairs.length).fill(0);
  /** The pair before each pair in that subsequence, or -1. */
  const previous = new Array<number>(pairs.length).fill(-1);
  /**
   * The Fenwick tree: `tree[i]` is the best pair (see `better`) of the pairs
   * so far whose `bIndex + 1` is in the range of node `i`, or -1.
   */
  const tree = new Array<number>(bLength + 1).fill(-1);
  /** The pair with the larger sum. For equal sums, the pair with the smaller `bIndex`. -1 is no pair. */
  function better(x: number, y: number): number {
    if (x === -1 || y === -1) {
      return Math.max(x, y);
    }
    if (sums[x] !== sums[y]) {
      return sums[x] > sums[y] ? x : y;
    }
    return pairs[x].bIndex < pairs[y].bIndex ? x : y;
  }

  let last = -1;
  pairs.forEach((pair, index) => {
    let before = -1;
    for (let i = pair.bIndex; i > 0; i -= i & -i) {
      before = better(before, tree[i]);
    }
    previous[index] = before;
    sums[index] = (before === -1 ? 0 : sums[before]) + weightOf(pair);
    for (let i = pair.bIndex + 1; i <= bLength; i += i & -i) {
      tree[i] = better(tree[i], index);
    }
    last = better(last, index);
  });

  const result: Pair[] = [];
  for (let index = last; index !== -1; index = previous[index]) {
    result.push(pairs[index]);
  }
  return result.reverse();
}

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
  const anchors = search
    ? heaviestIncreasing(uniquePairs(rangeA, rangeB), () => 1, rangeB.length)
    : [];
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
