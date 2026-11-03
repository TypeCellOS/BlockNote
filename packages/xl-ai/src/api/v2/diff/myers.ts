import type { MatchedPair } from "./types.js";

/**
 * The maximum edit distance of the search with a trace (see
 * {@link myersMatch}). The memory of that search increases with the square
 * of the edit distance.
 */
const MAX_TRACE_EDIT_DISTANCE = 1000;

/**
 * The default limit of the work of the search in linear space (see
 * {@link bisectMatch}): the number of steps on the diagonals (each step is at
 * most one comparison). The time for this work is about 0.1 to 0.4 s. An
 * edit distance of 1,000 in sequences of 2,000 items is about 1,000,000
 * steps.
 */
export const DEFAULT_MAX_WORK = 10_000_000;

/**
 * Matches `a` and `b` with the Myers O(ND) diff algorithm. The result is a
 * longest common subsequence, as matched pairs.
 *
 * The function always matches the common prefix and the common suffix. For
 * the rest, it uses the search with a trace, if the edit distance is at most
 * 1,000. Else, it uses the search in linear space ({@link bisectMatch}),
 * with the work limit `maxWork`. The two searches can give different
 * subsequences of the same length. The search with a trace was the only one
 * before, thus its results stay the same.
 */
export function myersMatch<A, B>(
  a: readonly A[],
  b: readonly B[],
  equals: (a: A, b: B) => boolean,
  maxWork = DEFAULT_MAX_WORK,
): MatchedPair[] {
  const pairs: MatchedPair[] = [];

  let start = 0;
  while (start < a.length && start < b.length && equals(a[start], b[start])) {
    pairs.push({ aIndex: start, bIndex: start });
    start++;
  }

  let aEnd = a.length;
  let bEnd = b.length;
  const suffix: MatchedPair[] = [];
  while (aEnd > start && bEnd > start && equals(a[aEnd - 1], b[bEnd - 1])) {
    aEnd--;
    bEnd--;
    suffix.push({ aIndex: aEnd, bIndex: bEnd });
  }

  const middle =
    traceMatch(
      a,
      b,
      start,
      aEnd,
      start,
      bEnd,
      equals,
      MAX_TRACE_EDIT_DISTANCE,
    ) ??
    bisectMatch(
      a.slice(start, aEnd),
      b.slice(start, bEnd),
      equals,
      maxWork,
    ).map((pair) => ({
      aIndex: start + pair.aIndex,
      bIndex: start + pair.bIndex,
    }));
  pairs.push(...middle);
  pairs.push(...suffix.reverse());
  return pairs;
}

/**
 * The Myers diff with a trace of each step, for the ranges. The memory
 * increases with the square of the edit distance. Returns `undefined` if the
 * ranges need more than `maxEditDistance` edits.
 */
function traceMatch<A, B>(
  a: readonly A[],
  b: readonly B[],
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
  equals: (a: A, b: B) => boolean,
  maxEditDistance: number,
): MatchedPair[] | undefined {
  const n = aEnd - aStart;
  const m = bEnd - bStart;
  if (n === 0 || m === 0) {
    return [];
  }

  const max = Math.min(n + m, maxEditDistance);
  // `v[k + offset]` is the largest x on diagonal k (k = x - y).
  const offset = max + 1;
  const v = new Int32Array(2 * max + 3);
  // `trace[d]` is a copy of `v` for the diagonals -(d+1) to (d+1), before
  // step d. The backtrack of step d reads only that copy.
  const trace: Int32Array[] = [];

  for (let d = 0; d <= max; d++) {
    trace.push(v.slice(offset - d - 1, offset + d + 2));
    for (let k = -d; k <= d; k += 2) {
      let x =
        k === -d || (k !== d && v[k - 1 + offset] < v[k + 1 + offset])
          ? v[k + 1 + offset]
          : v[k - 1 + offset] + 1;
      let y = x - k;
      while (x < n && y < m && equals(a[aStart + x], b[bStart + y])) {
        x++;
        y++;
      }
      v[k + offset] = x;
      if (x >= n && y >= m) {
        return backtrack(trace, d, n, m, aStart, bStart);
      }
    }
  }

  return undefined;
}

function backtrack(
  trace: Int32Array[],
  finalD: number,
  n: number,
  m: number,
  aStart: number,
  bStart: number,
): MatchedPair[] {
  const pairs: MatchedPair[] = [];
  let x = n;
  let y = m;

  for (let d = finalD; d >= 0; d--) {
    const slice = trace[d];
    const k = x - y;
    const prevK =
      k === -d ||
      (k !== d && diagonal(slice, d, k - 1) < diagonal(slice, d, k + 1))
        ? k + 1
        : k - 1;
    const prevX = diagonal(slice, d, prevK);
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      x--;
      y--;
      pairs.push({ aIndex: aStart + x, bIndex: bStart + y });
    }

    if (d > 0) {
      x = prevX;
      y = prevY;
    }
  }

  return pairs.reverse();
}

/** The value of diagonal `k` in the copy for step `d`. Diagonal `k` has the index `k + d + 1`. */
function diagonal(slice: ArrayLike<number>, d: number, k: number): number {
  return slice[k + d + 1];
}

/**
 * Matches `a` and `b` with the Myers O(ND) diff algorithm, in linear space
 * (the "middle snake" bisection, as in diff-match-patch). The result is a
 * longest common subsequence, as matched pairs.
 *
 * The function always matches the common prefix and the common suffix. The
 * work for the rest is O((N + M) * D), for the edit distance D. If the work
 * becomes more than `maxWork`, the ranges that are not matched yet get only
 * their common prefix and suffix. The result is then a common subsequence,
 * but not always the longest one. The memory is O(N + M).
 */
export function bisectMatch<A, B>(
  a: readonly A[],
  b: readonly B[],
  equals: (a: A, b: B) => boolean,
  maxWork = DEFAULT_MAX_WORK,
): MatchedPair[] {
  const pairs: MatchedPair[] = [];
  let work = 0;
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
    // If delta is odd, the forward search finds the meeting point. Else the
    // backward search finds it.
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
        work++;
        while (x < n && y < m && equals(a[aStart + x], b[bStart + y])) {
          x++;
          y++;
          work++;
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
        work++;
        while (x < n && y < m && equals(a[aEnd - 1 - x], b[bEnd - 1 - y])) {
          x++;
          y++;
          work++;
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

      if (work > maxWork) {
        return undefined;
      }
    }
    return undefined;
  }
}
