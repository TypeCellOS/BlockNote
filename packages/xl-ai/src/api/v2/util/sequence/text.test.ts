// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import { alignText, charKind, type TextUnit } from "./text.js";

function units(text: string): TextUnit[] {
  return Array.from(text).map((char) => ({ key: char, kind: charKind(char) }));
}

/** The matched characters of `b`, as a string. */
function kept(a: string, b: string): string {
  const unitsB = Array.from(b);
  return alignText(units(a), units(b))
    .map((pair) => unitsB[pair.bIndex])
    .join("");
}

describe("alignText", () => {
  it("matches equal words, also at a different position", () => {
    expect(kept("one two three", "zero one two four")).toBe("one two ");
  });

  it("matches the characters of a word with a small change", () => {
    expect(kept("helo world", "hello world")).toBe("helo world");
  });

  it("does not match characters that are the same only by chance", () => {
    expect(kept("cat sat", "dog ran")).toBe("");
  });

  it("matches the whitespace between matched tokens", () => {
    expect(kept("a b", "a  b")).toBe("a b");
  });

  it("matches the whitespace next to a matched token, also between two changed words", () => {
    expect(kept("alpha delta", "beta delta")).toBe(" delta");
    expect(kept("alpha delta", "alpha gamma")).toBe("alpha ");
  });
});

describe("alignText with the change unit word", () => {
  function keptByWord(a: string, b: string): string {
    const unitsB = Array.from(b);
    return alignText(units(a), units(b), "word")
      .map((pair) => unitsB[pair.bIndex])
      .join("");
  }

  it("does not match the characters of a changed word", () => {
    expect(keptByWord("the colour is", "the color is")).toBe("the  is");
  });

  it("matches equal words and the whitespace next to them, as with characters", () => {
    expect(keptByWord("one two three", "zero one two four")).toBe("one two ");
  });
});
