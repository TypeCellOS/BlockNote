// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import { createRandom } from "../../testUtil/random.js";
import { anchoredMatch, uniquePairs } from "./anchored.js";
import { myersMatch } from "./myers.js";
import type { MatchedPair } from "./types.js";

const same = (x: string) => x;
const equals = (x: string, y: string) => x === y;

/** The length of a longest common subsequence, by dynamic programming (the oracle). */
function lcsLength(a: readonly string[], b: readonly string[]): number {
  let previous = new Array<number>(b.length + 1).fill(0);
  for (const x of a) {
    const row = [0];
    for (let j = 0; j < b.length; j++) {
      row.push(
        x === b[j] ? previous[j] + 1 : Math.max(previous[j + 1], row[j]),
      );
    }
    previous = row;
  }
  return previous[b.length];
}

/** Returns true if the pairs match equal items, in order, with valid indexes. */
function isCommonSubsequence(
  pairs: readonly MatchedPair[],
  a: readonly string[],
  b: readonly string[],
): boolean {
  return pairs.every(
    (pair, i) =>
      pair.aIndex >= 0 &&
      pair.bIndex >= 0 &&
      pair.aIndex < a.length &&
      pair.bIndex < b.length &&
      a[pair.aIndex] === b[pair.bIndex] &&
      (i === 0 ||
        (pair.aIndex > pairs[i - 1].aIndex &&
          pair.bIndex > pairs[i - 1].bIndex)),
  );
}

/** Makes sure that the pairs match equal items, in order, with valid indexes. */
function expectCommonSubsequence(
  pairs: readonly MatchedPair[],
  a: readonly string[],
  b: readonly string[],
) {
  pairs.forEach((pair, i) => {
    expect(pair.aIndex).toBeGreaterThanOrEqual(0);
    expect(pair.bIndex).toBeGreaterThanOrEqual(0);
    expect(pair.aIndex).toBeLessThan(a.length);
    expect(pair.bIndex).toBeLessThan(b.length);
    expect(a[pair.aIndex]).toBe(b[pair.bIndex]);
    if (i > 0) {
      expect(pair.aIndex).toBeGreaterThan(pairs[i - 1].aIndex);
      expect(pair.bIndex).toBeGreaterThan(pairs[i - 1].bIndex);
    }
  });
}

/** The naive definition of `uniquePairs`: count each key on each side. */
function naiveUniquePairs(
  keysA: readonly (string | undefined)[],
  keysB: readonly (string | undefined)[],
): MatchedPair[] {
  const count = (keys: readonly (string | undefined)[], key: string) =>
    keys.filter((other) => other === key).length;
  const pairs: MatchedPair[] = [];
  keysA.forEach((key, aIndex) => {
    if (
      key !== undefined &&
      count(keysA, key) === 1 &&
      count(keysB, key) === 1
    ) {
      pairs.push({ aIndex, bIndex: keysB.indexOf(key) });
    }
  });
  return pairs;
}

/** All sequences over the alphabet with a length from 0 to `maxLength`. */
function allSequences(alphabet: string, maxLength: number): string[][] {
  const result: string[][] = [[]];
  let level: string[][] = [[]];
  for (let length = 1; length <= maxLength; length++) {
    level = level.flatMap((sequence) =>
      Array.from(alphabet, (char) => [...sequence, char]),
    );
    result.push(...level);
  }
  return result;
}

/** A random permutation of the items. */
function shuffle<T>(
  items: readonly T[],
  random: ReturnType<typeof createRandom>,
) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = random.int(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

describe("anchoredMatch: properties", () => {
  it("gives a common subsequence for all sequences of length 0 to 4 over {a, b, c}", () => {
    const sequences = allSequences("abc", 4);
    for (const a of sequences) {
      for (const b of sequences) {
        const pairs = anchoredMatch(a, b, same);
        if (!isCommonSubsequence(pairs, a, b)) {
          expect({ a, b, pairs }).toBeUndefined();
        }
      }
    }
  });

  it("gives the Myers result if no key is in each side one time", () => {
    // Each key is in `a` two times. Thus, there are no anchors, and the
    // range gets the Myers diff.
    const random = createRandom(21);
    for (let run = 0; run < 100; run++) {
      const half = Array.from({ length: random.int(20) }, () =>
        String(random.int(4)),
      );
      const a = shuffle([...half, ...half], random);
      const b = Array.from({ length: random.int(40) }, () =>
        String(random.int(4)),
      );
      expect(anchoredMatch(a, b, same)).toEqual(myersMatch(a, b, equals));
    }
  });

  it("gives a longest common subsequence for two permutations of distinct keys", () => {
    // All keys are anchors. The longest increasing subsequence of the
    // anchors is then a longest common subsequence.
    const random = createRandom(22);
    for (let run = 0; run < 100; run++) {
      const keys = Array.from({ length: random.int(40) }, (_, i) => `k${i}`);
      const a = shuffle(keys, random);
      const b = shuffle(keys, random).filter(() => random.chance(0.8));
      const pairs = anchoredMatch(a, b, same);
      expectCommonSubsequence(pairs, a, b);
      expect(pairs.length).toBe(lcsLength(a, b));
    }
  });

  it("gives a common subsequence for random inputs, and the full match for equal inputs", () => {
    const random = createRandom(23);
    for (let run = 0; run < 150; run++) {
      const alphabet = 1 + random.int(30);
      const a = Array.from({ length: random.int(80) }, () =>
        String(random.int(alphabet)),
      );
      const b = random.chance(0.2)
        ? [...a]
        : Array.from({ length: random.int(80) }, () =>
            String(random.int(alphabet)),
          );
      const pairs = anchoredMatch(a, b, same);
      expectCommonSubsequence(pairs, a, b);
      expect(pairs.length).toBeLessThanOrEqual(lcsLength(a, b));
      if (a.join(",") === b.join(",")) {
        expect(pairs).toHaveLength(a.length);
      }
    }
  });

  it("gives no pairs if a side is empty or no keys are equal", () => {
    expect(anchoredMatch([], ["a"], same)).toEqual([]);
    expect(anchoredMatch(["a"], [], same)).toEqual([]);
    expect(anchoredMatch([], [], same)).toEqual([]);
    expect(anchoredMatch(["a", "b"], ["c", "d"], same)).toEqual([]);
  });

  it("matches the anchors also if they are at the two ends", () => {
    expect(anchoredMatch(["u", "x", "x"], ["x", "x", "u"], same)).toEqual([
      { aIndex: 0, bIndex: 2 },
    ]);
  });
});

describe("anchoredMatch: the shared work limit", () => {
  it("gives pairs in order after the work limit, for an input with one new anchor at each level", () => {
    // x1 x0 x2 x1 x3 x2 ...: each search for anchors finds one new anchor.
    // The searches use up the work limit (at least DEFAULT_MAX_WORK). After
    // the limit, a gap gets only its common prefix and suffix.
    const count = 8000;
    const a = Array.from({ length: count }, (_, i) => [
      `x${i + 1}`,
      `x${i}`,
    ]).flat();
    const b = Array.from({ length: count + 1 }, (_, i) => `x${i}`);
    const pairs = anchoredMatch(a, b, same);
    expectCommonSubsequence(pairs, a, b);
    // The longest common subsequence is `count` items. The limit makes the
    // result shorter, but not empty.
    expect(pairs.length).toBeGreaterThan(0);
    expect(pairs.length).toBeLessThanOrEqual(count);
  });
});

describe("anchoredMatch: the size of a small gap (SMALL_GAP = 2000)", () => {
  /**
   * `S` and `E` are anchors of the full input. `u` is in each side two
   * times, thus it is only an anchor of the gap between `S` and `E`. In
   * that gap, the anchor `u` crosses all the `x` items: with a search for
   * anchors in the gap, only `u` matches there. The Myers diff of the gap
   * matches the `x` items.
   */
  function input(countA: number, countB: number) {
    const a = ["S", "u", ...Array<string>(countA).fill("x"), "E", "u"];
    const b = ["S", ...Array<string>(countB).fill("x"), "u", "E", "u"];
    return { a, b };
  }

  it("gives a gap of 2,000 items the Myers diff, without a search for anchors", () => {
    // The gap has 1 + 999 items of `a` and 999 + 1 items of `b`.
    const { a, b } = input(999, 999);
    const pairs = anchoredMatch(a, b, same);
    expectCommonSubsequence(pairs, a, b);
    expect(pairs).toHaveLength(lcsLength(a, b));
    expect(pairs).toHaveLength(1 + 999 + 1 + 1);
  });

  it("searches anchors again in a gap of 2,001 items, and the result is then not the longest", () => {
    // The gap has 1 + 1000 items of `a` and 999 + 1 items of `b`.
    const { a, b } = input(1000, 999);
    const pairs = anchoredMatch(a, b, same);
    expectCommonSubsequence(pairs, a, b);
    // S, u, E, u. The documented limit of the patience method: the result
    // is a common subsequence, but not always the longest one.
    expect(pairs).toHaveLength(4);
    expect(lcsLength(a, b)).toBe(1 + 999 + 1 + 1);
  });
});

describe("uniquePairs", () => {
  it("gives the same pairs as the naive definition", () => {
    const random = createRandom(24);
    for (let run = 0; run < 300; run++) {
      const key = () =>
        random.chance(0.1) ? undefined : String(random.int(1 + random.int(8)));
      const keysA = Array.from({ length: random.int(12) }, key);
      const keysB = Array.from({ length: random.int(12) }, key);
      expect(uniquePairs(keysA, keysB)).toEqual(naiveUniquePairs(keysA, keysB));
    }
  });

  it("does not count `undefined` as a key, also if it is in each side one time", () => {
    expect(uniquePairs([undefined, "a"], ["a", undefined])).toEqual([
      { aIndex: 1, bIndex: 0 },
    ]);
  });

  it("does not use a key that is in one side three times", () => {
    expect(uniquePairs(["a", "a", "a"], ["a"])).toEqual([]);
  });

  it("uses keys that look like object properties as normal keys", () => {
    expect(
      uniquePairs(["__proto__", "constructor"], ["constructor", "__proto__"]),
    ).toEqual([
      { aIndex: 0, bIndex: 1 },
      { aIndex: 1, bIndex: 0 },
    ]);
  });
});
