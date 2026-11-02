import { describe, expect, it } from "vite-plus/test";

import { textOverlaps, wordSize } from "./overlap.js";

describe("textOverlaps", () => {
  it("counts the word characters that each pair of texts has in common", () => {
    expect(textOverlaps(["Hello world", "Bye"], ["Hello brave world"])).toEqual(
      [{ aIndex: 0, bIndex: 0, size: 10 }],
    );
  });

  it("does not compare letter case", () => {
    expect(textOverlaps(["Hello"], ["hello"])).toEqual([
      { aIndex: 0, bIndex: 0, size: 5 },
    ]);
  });

  it("does not count whitespace and characters that are not words", () => {
    expect(textOverlaps(["a, b!"], ["a; b?"])).toEqual([
      { aIndex: 0, bIndex: 0, size: 2 },
    ]);
  });

  it("gives an overlap for each part of a split text", () => {
    expect(
      textOverlaps(
        ["Colored centered paragraph"],
        ["Colored centered", "paragraph"],
      ),
    ).toEqual([
      { aIndex: 0, bIndex: 0, size: 15 },
      { aIndex: 0, bIndex: 1, size: 9 },
    ]);
  });

  it("gives no overlap for texts without common words", () => {
    expect(textOverlaps(["cat"], ["dog"])).toEqual([]);
  });
});

describe("wordSize", () => {
  it("counts only word characters", () => {
    expect(wordSize("Hi, you!")).toBe(5);
    expect(wordSize("")).toBe(0);
  });
});
