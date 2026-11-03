import { describe, expect, it } from "vite-plus/test";

import { expectValidMatching } from "../testUtil/matching.js";
import { bisectMatch, myersMatch } from "./myers.js";

const equals = (x: string, y: string) => x === y;

describe("myersMatch", () => {
  it("matches a longest common subsequence", () => {
    const a = Array.from("ABCABBA");
    const b = Array.from("CBABAC");
    const pairs = myersMatch(a, b, equals);
    expectValidMatching(pairs, a, b);
    expect(pairs).toHaveLength(4);
  });

  it("matches all elements if the sequences are equal", () => {
    const a = Array.from("hello");
    expect(myersMatch(a, a, equals)).toEqual(
      a.map((_, i) => ({ aIndex: i, bIndex: i })),
    );
  });

  it("gives no matches for empty sequences", () => {
    expect(myersMatch([], Array.from("abc"), equals)).toEqual([]);
    expect(myersMatch(Array.from("abc"), [], equals)).toEqual([]);
  });

  it("uses the equality function, not identity", () => {
    const pairs = myersMatch(["A", "b"], ["a", "B"], (x, y) => {
      return x.toLowerCase() === y.toLowerCase();
    });
    expect(pairs).toHaveLength(2);
  });

  it("matches only the common prefix and suffix after the work limit", () => {
    // More than 1,000 edits, thus the search in linear space, with no work.
    const a = ["x", ...Array.from({ length: 1100 }, () => "a"), "x"];
    const b = ["x", ...Array.from({ length: 1100 }, () => "b"), "x"];
    expect(myersMatch(a, b, equals, 0)).toEqual([
      { aIndex: 0, bIndex: 0 },
      { aIndex: 1101, bIndex: 1101 },
    ]);
  });

  it("matches a longest common subsequence for random sequences", () => {
    // A small random generator, for the same cases on each run.
    let state = 1;
    const random = (n: number) => {
      state = (state * 1103515245 + 12345) % 2147483648;
      return state % n;
    };
    for (let run = 0; run < 300; run++) {
      const alphabet = 1 + random(4);
      const a = Array.from({ length: random(120) }, () =>
        String(random(alphabet)),
      );
      const b = Array.from({ length: random(120) }, () =>
        String(random(alphabet)),
      );
      for (const match of [myersMatch, bisectMatch]) {
        const pairs = match(a, b, equals);
        expectValidMatching(pairs, a, b);
        expect(pairs.length).toBe(lcsLength(a, b));
      }
    }
  });

  it("matches sequences with more than 1,000 edits", () => {
    // 1,100 removed items between items that stay.
    const a = Array.from({ length: 1100 }, (_, i) => [
      "keep",
      `drop ${i}`,
    ]).flat();
    const b = Array.from({ length: 1100 }, () => "keep");
    expect(myersMatch(a, b, equals)).toHaveLength(1100);
  });
});

/** The length of a longest common subsequence, by dynamic programming. */
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
