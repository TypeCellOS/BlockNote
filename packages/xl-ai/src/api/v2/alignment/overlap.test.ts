import { describe, expect, it } from "vite-plus/test";

import { type OverlapText, textOverlaps, wordSize } from "./overlap.js";

/** Texts with their own text as the key. */
function texts(...values: string[]): OverlapText[] {
  return values.map((text) => ({ text, key: text }));
}

function overlaps(a: string[], b: string[]) {
  return textOverlaps(texts(...a), texts(...b));
}

describe("textOverlaps", () => {
  it("counts the word characters that each pair of texts has in common", () => {
    expect(overlaps(["Hello world", "Bye"], ["Hello brave world"])).toEqual([
      { aIndex: 0, bIndex: 0, size: 10 },
    ]);
  });

  it("does not compare letter case", () => {
    expect(overlaps(["Hello"], ["hello"])).toEqual([
      { aIndex: 0, bIndex: 0, size: 5 },
    ]);
  });

  it("does not count whitespace and characters that are not words", () => {
    expect(overlaps(["a, b!"], ["a; b?"])).toEqual([
      { aIndex: 0, bIndex: 0, size: 2 },
    ]);
  });

  it("gives an overlap for each part of a split text", () => {
    expect(
      overlaps(
        ["Colored centered paragraph"],
        ["Colored centered", "paragraph"],
      ),
    ).toEqual([
      { aIndex: 0, bIndex: 0, size: 15 },
      { aIndex: 0, bIndex: 1, size: 9 },
    ]);
  });

  it("gives no overlap for texts without common words", () => {
    expect(overlaps(["cat"], ["dog"])).toEqual([]);
  });
});

describe("wordSize", () => {
  it("counts the word characters, and 1 for a text without words", () => {
    expect(wordSize({ text: "Hi, you!", key: "Hi, you!" })).toBe(5);
    expect(wordSize({ text: "", key: "" })).toBe(1);
  });
});

describe("the key token", () => {
  it("aligns a block with an equal text as one block", () => {
    // Without the key, the diff gives "hello world" to the first block.
    expect(
      overlaps(
        ["Hello world nested", "Hello world double nested"],
        ["Hello world double nested"],
      ),
    ).toEqual([{ aIndex: 1, bIndex: 0, size: 22 }]);
  });

  it("gives a text without words an overlap with an equal key only", () => {
    const image = (url: string) => ({ text: "", key: url });
    expect(
      textOverlaps([image("a.png"), image("b.png")], [image("b.png")]),
    ).toEqual([{ aIndex: 1, bIndex: 0, size: 1 }]);
  });
});
