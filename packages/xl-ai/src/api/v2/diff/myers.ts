import type { MatchedPair } from "./types.js";

/**
 * The default maximum edit distance for {@link myersMatch}. The memory use
 * increases with the square of the edit distance.
 */
export const DEFAULT_MAX_EDIT_DISTANCE = 1000;

/**
 * Matches `a` and `b` with the Myers O(ND) diff algorithm. The result is a
 * longest common subsequence, as matched pairs.
 *
 * The function always matches the common prefix and the common suffix. If the
 * middle part needs more than `maxEditDistance` edits, the function does not
 * match the middle part. The result is then the same as for a full replacement
 * of the middle part.
 */
export function myersMatch<A, B>(
  a: readonly A[],
  b: readonly B[],
  equals: (a: A, b: B) => boolean,
  maxEditDistance = DEFAULT_MAX_EDIT_DISTANCE,
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

  pairs.push(
    ...matchMiddle(a, b, start, aEnd, start, bEnd, equals, maxEditDistance),
  );
  pairs.push(...suffix.reverse());
  return pairs;
}

function matchMiddle<A, B>(
  a: readonly A[],
  b: readonly B[],
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
  equals: (a: A, b: B) => boolean,
  maxEditDistance: number,
): MatchedPair[] {
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

  return [];
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
    // Diagonal k has the index `k + d + 1` in the copy for step d.
    const get = (k: number) => slice[k + d + 1];
    const k = x - y;
    const prevK =
      k === -d || (k !== d && get(k - 1) < get(k + 1)) ? k + 1 : k - 1;
    const prevX = get(prevK);
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
