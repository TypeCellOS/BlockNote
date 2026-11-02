import { describe, expect, it } from "vite-plus/test";

import { expectValidMatching } from "../testUtil/matching.js";
import { myersMatch } from "./myers.js";

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

  it("matches only the common prefix and suffix after the maximum edit distance", () => {
    const pairs = myersMatch(
      Array.from("xabcx"),
      Array.from("xcbax"),
      equals,
      1,
    );
    expect(pairs).toEqual([
      { aIndex: 0, bIndex: 0 },
      { aIndex: 4, bIndex: 4 },
    ]);
  });
});
