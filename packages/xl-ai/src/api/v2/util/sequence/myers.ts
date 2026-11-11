/* eslint-disable complexity, max-depth, max-lines-per-function -- The Myers algorithm in linear space: a standard algorithm behind a small interface. */
import type { MatchedPair } from "./types.js";

/**
 * The default limit of the work of {@link myersMatch}: the number of steps on
 * the diagonals (each step is at most one comparison). The time for this
 * work is about 0.1 to 0.4 s. An edit distance of 1,000 in sequences of
 * 2,000 items is about 1,000,000 steps.
 *
 * @internal
 */
export const DEFAULT_MAX_WORK = 10_000_000;

/**
 * A work limit that more than one call of {@link myersMatch} can share: the
 * number of steps that are left. Each call uses steps of it.
 *
 * @internal
 */
export type WorkBudget = { left: number };

/** The steps of {@link workBudgetFor} for each item of the input. */
const WORK_PER_ITEM = 50;

/**
 * A work limit for the diffs of an input of `size` items (the items of the
 * two sides) and of its parts: {@link WORK_PER_ITEM} steps for each item,
 * and at least {@link DEFAULT_MAX_WORK}. A caller that diffs many parts of
 * one input (for example the gaps between anchors) gives them this one
 * limit. Thus, the time is linear in the size of the input, also if each
 * part needs its full work.
 *
 * @internal
 */
export function workBudgetFor(size: number): WorkBudget {
  return { left: Math.max(DEFAULT_MAX_WORK, WORK_PER_ITEM * size) };
}

/**
 * Matches `a` and `b` with the Myers O(ND) diff algorithm, in linear space
 * (the "middle snake" bisection, as in diff-match-patch). The result is a
 * longest common subsequence, as matched pairs.
 *
 * The function always matches the common prefix and the common suffix. The
 * work for the rest is O((N + M) * D), for the edit distance D. If `budget`
 * has no steps left, the ranges that are not matched yet get only their
 * common prefix and suffix. The result is then a common subsequence,
 * but not always the longest one. The memory is O(N + M).
 */
export function myersMatch<A, B>(
  a: readonly A[],
  b: readonly B[],
  equals: (a: A, b: B) => boolean,
  budget: WorkBudget = { left: DEFAULT_MAX_WORK },
): MatchedPair[] {
  const pairs: MatchedPair[] = [];
  match(0, a.length, 0, b.length);
  return pairs;

  /**
   * Adds the pairs of the ranges `a[aStart, aEnd)` and `b[bStart, bEnd)`, in
   * order. The recursion depth is about log2(D), because each bisection
   * halves the edit distance.
   */
  function match(aStart: number, aEnd: number, bStart: number, bEnd: number) {
    while (aStart < aEnd && bStart < bEnd && equals(a[aStart], b[bStart])) {
      pairs.push({ aIndex: aStart, bIndex: bStart });
      aStart++;
      bStart++;
    }
    const suffix: MatchedPair[] = [];
    while (aEnd > aStart && bEnd > bStart && equals(a[aEnd - 1], b[bEnd - 1])) {
      aEnd--;
      bEnd--;
      suffix.push({ aIndex: aEnd, bIndex: bEnd });
    }
    if (aStart < aEnd && bStart < bEnd) {
      const split = bisect(aStart, aEnd, bStart, bEnd);
      // Both parts must be smaller than the ranges. Else the recursion
      // would not end.
      const inside =
        split !== undefined &&
        (split.a > aStart || split.b > bStart) &&
        (split.a < aEnd || split.b < bEnd);
      if (inside) {
        match(aStart, split.a, bStart, split.b);
        match(split.a, aEnd, split.b, bEnd);
      }
    }
    for (let i = suffix.length - 1; i >= 0; i--) {
      pairs.push(suffix[i]);
    }
  }

  /**
   * Finds a point on a shortest edit path of the ranges, near the middle:
   * the forward and the backward searches meet there. Returns `undefined` if
   * the ranges have nothing in common, or if the work limit is reached.
   */
  function bisect(
    aStart: number,
    aEnd: number,
    bStart: number,
    bEnd: number,
  ): { a: number; b: number } | undefined {
    const n = aEnd - aStart;
    const m = bEnd - bStart;
    const maxD = Math.ceil((n + m) / 2);
    const offset = maxD;
    const length = 2 * maxD + 2;
    // `forward[offset + k]` is the largest x on diagonal k (k = x - y) of the
    // forward search. `backward` is the same, from the ends of the ranges.
    // -1: not reached yet.
    const forward = new Int32Array(length).fill(-1);
    const backward = new Int32Array(length).fill(-1);
    forward[offset + 1] = 0;
    backward[offset + 1] = 0;
    const delta = n - m;
    // If delta is odd, the forward search finds the point where the two
    // searches meet. Else the backward search finds it.
    const forwardMeets = delta % 2 !== 0;
    // Diagonals outside the ranges: the searches skip them.
    let forwardStart = 0;
    let forwardEnd = 0;
    let backwardStart = 0;
    let backwardEnd = 0;

    for (let d = 0; d < maxD; d++) {
      for (let k = -d + forwardStart; k <= d - forwardEnd; k += 2) {
        const index = offset + k;
        let x =
          k === -d || (k !== d && forward[index - 1] < forward[index + 1])
            ? forward[index + 1]
            : forward[index - 1] + 1;
        let y = x - k;
        budget.left--;
        while (x < n && y < m && equals(a[aStart + x], b[bStart + y])) {
          x++;
          y++;
          budget.left--;
        }
        forward[index] = x;
        if (x > n) {
          forwardEnd += 2;
        } else if (y > m) {
          forwardStart += 2;
        } else if (forwardMeets) {
          const other = offset + delta - k;
          if (
            other >= 0 &&
            other < length &&
            backward[other] !== -1 &&
            x >= n - backward[other]
          ) {
            return { a: aStart + x, b: bStart + y };
          }
        }
      }

      for (let k = -d + backwardStart; k <= d - backwardEnd; k += 2) {
        const index = offset + k;
        let x =
          k === -d || (k !== d && backward[index - 1] < backward[index + 1])
            ? backward[index + 1]
            : backward[index - 1] + 1;
        let y = x - k;
        budget.left--;
        while (x < n && y < m && equals(a[aEnd - 1 - x], b[bEnd - 1 - y])) {
          x++;
          y++;
          budget.left--;
        }
        backward[index] = x;
        if (x > n) {
          backwardEnd += 2;
        } else if (y > m) {
          backwardStart += 2;
        } else if (!forwardMeets) {
          const other = offset + delta - k;
          if (other >= 0 && other < length && forward[other] !== -1) {
            const forwardX = forward[other];
            const forwardY = forwardX - (other - offset);
            if (forwardX >= n - x) {
              return { a: aStart + forwardX, b: bStart + forwardY };
            }
          }
        }
      }

      if (budget.left < 0) {
        return undefined;
      }
    }
    return undefined;
  }
}
