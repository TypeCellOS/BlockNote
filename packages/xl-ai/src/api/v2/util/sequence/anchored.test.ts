// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import { anchoredMatch } from "./anchored.js";
import { myersMatch } from "./myers.js";

const same = (x: string) => x;

describe("anchoredMatch", () => {
  it("gives the same result as the Myers diff for a small change", () => {
    const a = "the quick brown fox jumps".split(" ");
    const b = "the quick red fox jumps high".split(" ");
    expect(anchoredMatch(a, b, same)).toEqual(
      myersMatch(a, b, (x, y) => x === y),
    );
  });

  it("matches large inputs with many changes", () => {
    // 2,000 changes. The anchors find the unique "id" items first.
    const a = Array.from({ length: 1000 }, (_, i) => [
      `id${i}`,
      "old",
      "x",
    ]).flat();
    const b = Array.from({ length: 1000 }, (_, i) => [
      `id${i}`,
      "new",
      "x",
    ]).flat();

    const pairs = anchoredMatch(a, b, same);
    // Each "id" and each "x" stays.
    expect(pairs).toHaveLength(2000);
    expect(pairs.every((pair) => a[pair.aIndex] === b[pair.bIndex])).toBe(true);
  });

  it("is fast for a sequence in which each level of anchors gives one new anchor", () => {
    // x1 x0 x2 x1 x3 x2 ...: each key is in `a` two times, except the first
    // and the last key.
    const count = 40_000;
    const a = Array.from({ length: count }, (_, i) => [
      `x${i + 1}`,
      `x${i}`,
    ]).flat();
    const b = Array.from({ length: count + 1 }, (_, i) => `x${i}`);

    const start = performance.now();
    const pairs = anchoredMatch(a, b, same);
    // Usually less than one second. With a new search for anchors between
    // each two anchors, the time is quadratic: some minutes. The limit is
    // high, because other tests can run at the same time.
    expect(performance.now() - start).toBeLessThan(20_000);
    expect(pairs.every((pair) => a[pair.aIndex] === b[pair.bIndex])).toBe(true);
  });

  it("finds anchors again between two anchors", () => {
    // Each word is two times in `a` and in `b`, thus it is not an anchor of
    // the full input. Between "start" and "middle", each word is one time: an
    // anchor of that gap. In `b`, a new item follows each word of that gap.
    // Thus, a Myers diff of the gap needs 5,000 edits, more than its limit.
    const words = Array.from({ length: 5000 }, (_, i) => `w${i}`);
    const a = ["start", ...words, "middle", ...words, "end"];
    const b = [
      "start",
      ...words.flatMap((word) => [word, "new"]),
      "middle",
      ...words,
      "end",
    ];

    const pairs = anchoredMatch(a, b, same);
    expect(pairs).toHaveLength(2 * words.length + 3);
    expect(pairs.every((pair) => a[pair.aIndex] === b[pair.bIndex])).toBe(true);
  });

  it("gives pairs that do not cross", () => {
    const a = ["a", "b", "c", "d"];
    const b = ["c", "a", "b", "d"];
    const pairs = anchoredMatch(a, b, same);
    expect(pairs).toEqual([
      { aIndex: 0, bIndex: 1 },
      { aIndex: 1, bIndex: 2 },
      { aIndex: 3, bIndex: 3 },
    ]);
  });
});
