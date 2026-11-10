// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import { createRandom } from "../../testUtil/random.js";
import { DEFAULT_MAX_WORK, myersMatch, type WorkBudget } from "./myers.js";
import type { MatchedPair } from "./types.js";

const equals = (x: string, y: string) => x === y;

/** The length of a longest common subsequence, by dynamic programming (the oracle). */
function lcsLength<A, B>(
  a: readonly A[],
  b: readonly B[],
  same: (x: A, y: B) => boolean,
): number {
  let previous = new Array<number>(b.length + 1).fill(0);
  for (const x of a) {
    const row = [0];
    for (let j = 0; j < b.length; j++) {
      row.push(
        same(x, b[j]) ? previous[j] + 1 : Math.max(previous[j + 1], row[j]),
      );
    }
    previous = row;
  }
  return previous[b.length];
}

/** Returns a problem of the pairs as a string, or `undefined` if they are a valid matching. */
function matchingProblem<A, B>(
  pairs: readonly MatchedPair[],
  a: readonly A[],
  b: readonly B[],
  same: (x: A, y: B) => boolean,
): string | undefined {
  for (let i = 0; i < pairs.length; i++) {
    const { aIndex, bIndex } = pairs[i];
    if (
      !Number.isInteger(aIndex) ||
      !Number.isInteger(bIndex) ||
      aIndex < 0 ||
      bIndex < 0 ||
      aIndex >= a.length ||
      bIndex >= b.length
    ) {
      return `pair ${i} has an index outside the sequences`;
    }
    if (!same(a[aIndex], b[bIndex])) {
      return `pair ${i} matches items that are not equal`;
    }
    if (
      i > 0 &&
      (aIndex <= pairs[i - 1].aIndex || bIndex <= pairs[i - 1].bIndex)
    ) {
      return `pair ${i} is not after pair ${i - 1}`;
    }
  }
  return undefined;
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

/** The length of the common prefix, and of the common suffix after it. */
function commonEnds(a: readonly string[], b: readonly string[]) {
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) {
    prefix++;
  }
  let suffix = 0;
  while (
    suffix < a.length - prefix &&
    suffix < b.length - prefix &&
    a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  ) {
    suffix++;
  }
  return { prefix, suffix };
}

describe("myersMatch: exhaustive small inputs", () => {
  it("gives a longest common subsequence for all sequences of length 0 to 4 over {a, b, c}", () => {
    const sequences = allSequences("abc", 4);
    let failures = 0;
    for (const a of sequences) {
      for (const b of sequences) {
        const pairs = myersMatch(a, b, equals);
        const problem = matchingProblem(pairs, a, b, equals);
        if (problem !== undefined || pairs.length !== lcsLength(a, b, equals)) {
          failures++;
          expect({ a, b, problem, length: pairs.length }).toEqual({
            a,
            b,
            problem: undefined,
            length: lcsLength(a, b, equals),
          });
        }
      }
    }
    expect(failures).toBe(0);
  });

  it("gives a longest common subsequence for all sequences of length 0 to 7 over {a, b}", () => {
    const sequences = allSequences("ab", 7);
    for (const a of sequences) {
      for (const b of sequences) {
        const pairs = myersMatch(a, b, equals);
        if (
          matchingProblem(pairs, a, b, equals) !== undefined ||
          pairs.length !== lcsLength(a, b, equals)
        ) {
          expect({ a, b, pairs }).toBeUndefined();
        }
      }
    }
  });
});

describe("myersMatch: random inputs against the oracle", () => {
  it("gives a longest common subsequence for random inputs of very different sizes", () => {
    const random = createRandom(7);
    for (let run = 0; run < 200; run++) {
      const alphabet = 1 + random.int(6);
      const short = random.int(6);
      const long = random.int(150);
      const [lengthA, lengthB] = random.chance(0.5)
        ? [short, long]
        : [long, short];
      const a = Array.from({ length: lengthA }, () =>
        String(random.int(alphabet)),
      );
      const b = Array.from({ length: lengthB }, () =>
        String(random.int(alphabet)),
      );
      const pairs = myersMatch(a, b, equals);
      expect(matchingProblem(pairs, a, b, equals)).toBeUndefined();
      expect(pairs.length).toBe(lcsLength(a, b, equals));
    }
  });

  it("calls the equality function with an item of `a` first and an item of `b` second", () => {
    // `a` has numbers and `b` has strings. A call with the items in the
    // wrong order throws.
    const random = createRandom(11);
    for (let run = 0; run < 100; run++) {
      const a = Array.from({ length: random.int(30) }, () => random.int(3));
      const b = Array.from({ length: random.int(30) }, () =>
        String(random.int(3)),
      );
      const same = (x: number, y: string) => {
        if (typeof x !== "number" || typeof y !== "string") {
          throw new Error("The items are in the wrong order");
        }
        return String(x) === y;
      };
      const pairs = myersMatch(a, b, same);
      expect(matchingProblem(pairs, a, b, same)).toBeUndefined();
      expect(pairs.length).toBe(lcsLength(a, b, same));
    }
  });

  it("matches all items if all items are equal", () => {
    for (const [lengthA, lengthB] of [
      [0, 5],
      [1, 1],
      [5, 3],
      [3, 50],
    ]) {
      const a = Array.from({ length: lengthA }, () => "x");
      const b = Array.from({ length: lengthB }, () => "x");
      const pairs = myersMatch(a, b, equals);
      expect(matchingProblem(pairs, a, b, equals)).toBeUndefined();
      expect(pairs).toHaveLength(Math.min(lengthA, lengthB));
    }
  });

  it("gives no pairs if no items are equal", () => {
    expect(myersMatch(["a", "b", "c"], ["x", "y"], equals)).toEqual([]);
    expect(myersMatch(["a"], ["b"], equals)).toEqual([]);
    expect(myersMatch([], [], equals)).toEqual([]);
  });

  it("matches one item at each position of a long sequence", () => {
    const long = Array.from({ length: 40 }, (_, i) => `x${i}`);
    for (let k = 0; k < long.length; k++) {
      expect(myersMatch([long[k]], long, equals)).toEqual([
        { aIndex: 0, bIndex: k },
      ]);
      expect(myersMatch(long, [long[k]], equals)).toEqual([
        { aIndex: k, bIndex: 0 },
      ]);
    }
  });
});

describe("myersMatch: the work budget", () => {
  it("matches exactly the common prefix and suffix with a budget of 0", () => {
    const random = createRandom(3);
    for (let run = 0; run < 200; run++) {
      const a = Array.from({ length: random.int(12) }, () =>
        String(random.int(3)),
      );
      const b = Array.from({ length: random.int(12) }, () =>
        String(random.int(3)),
      );
      const { prefix, suffix } = commonEnds(a, b);
      const pairs = myersMatch(a, b, equals, { left: 0 });
      expect(matchingProblem(pairs, a, b, equals)).toBeUndefined();
      expect(pairs).toEqual([
        ...Array.from({ length: prefix }, (_, i) => ({
          aIndex: i,
          bIndex: i,
        })),
        ...Array.from({ length: suffix }, (_, i) => ({
          aIndex: a.length - suffix + i,
          bIndex: b.length - suffix + i,
        })),
      ]);
    }
  });

  it("gives a common subsequence with the common prefix and suffix for each budget", () => {
    const random = createRandom(5);
    for (let run = 0; run < 200; run++) {
      const a = Array.from({ length: random.int(40) }, () =>
        String(random.int(3)),
      );
      const b = Array.from({ length: random.int(40) }, () =>
        String(random.int(3)),
      );
      const left = random.int(60) - 5;
      const pairs = myersMatch(a, b, equals, { left });
      expect(matchingProblem(pairs, a, b, equals)).toBeUndefined();
      const { prefix, suffix } = commonEnds(a, b);
      expect(pairs.length).toBeGreaterThanOrEqual(prefix + suffix);
      expect(pairs.length).toBeLessThanOrEqual(lcsLength(a, b, equals));
    }
  });

  it("does not use the budget for the common prefix and suffix", () => {
    const a = Array.from("abcXdef");
    const b = Array.from("abcYdef");
    const budget: WorkBudget = { left: 100 };
    myersMatch(a, b, equals, budget);
    // The middle ("X" and "Y") uses some steps. The ends use none.
    expect(budget.left).toBeLessThan(100);
    const same: WorkBudget = { left: 100 };
    myersMatch(Array.from("abcdef"), Array.from("abcdef"), equals, same);
    expect(same.left).toBe(100);
  });

  it("shares the budget between calls: a second call with an empty budget matches only the ends", () => {
    const a = Array.from("xaybzcx");
    const b = Array.from("xbzcayx");
    const budget: WorkBudget = { left: DEFAULT_MAX_WORK };
    expect(myersMatch(a, b, equals, budget)).toHaveLength(
      lcsLength(a, b, equals),
    );
    const used = DEFAULT_MAX_WORK - budget.left;
    expect(used).toBeGreaterThan(0);
    // A budget that is used up stays used up.
    const empty: WorkBudget = { left: 0 };
    myersMatch(a, b, equals, empty);
    expect(empty.left).toBeLessThan(0);
    expect(myersMatch(a, b, equals, empty)).toEqual([
      { aIndex: 0, bIndex: 0 },
      { aIndex: 6, bIndex: 6 },
    ]);
  });

  it("gives the same result for each budget that is large enough", () => {
    const random = createRandom(9);
    for (let run = 0; run < 50; run++) {
      const a = Array.from({ length: random.int(60) }, () =>
        String(random.int(4)),
      );
      const b = Array.from({ length: random.int(60) }, () =>
        String(random.int(4)),
      );
      expect(myersMatch(a, b, equals, { left: 1_000_000 })).toEqual(
        myersMatch(a, b, equals),
      );
    }
  });
});
