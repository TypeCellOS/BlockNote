// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import { createRandom } from "../../testUtil/random.js";
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

/** A random text of words, spaces and punctuation from a small alphabet. */
function randomText(random: ReturnType<typeof createRandom>, length: number) {
  const chars = ["a", "b", "c", "a", "b", " ", " ", ".", "é", "😀", "\n"];
  return Array.from({ length }, () => random.pick(chars)).join("");
}

describe("alignText: properties", () => {
  it("gives pairs of equal units, in order, for random texts", () => {
    const random = createRandom(41);
    for (let run = 0; run < 300; run++) {
      const a = units(randomText(random, random.int(30)));
      const b = units(randomText(random, random.int(30)));
      const pairs = alignText(a, b);
      pairs.forEach((pair, i) => {
        expect(a[pair.aIndex].key).toBe(b[pair.bIndex].key);
        if (i > 0) {
          expect(pair.aIndex).toBeGreaterThan(pairs[i - 1].aIndex);
          expect(pair.bIndex).toBeGreaterThan(pairs[i - 1].bIndex);
        }
      });
    }
  });

  it("matches each unit of a text with itself", () => {
    const random = createRandom(42);
    for (let run = 0; run < 100; run++) {
      const a = units(randomText(random, random.int(40)));
      expect(alignText(a, a)).toEqual(
        a.map((_, i) => ({ aIndex: i, bIndex: i })),
      );
    }
  });

  it("gives no pairs if a side is empty", () => {
    expect(alignText([], units("a b"))).toEqual([]);
    expect(alignText(units("a b"), [])).toEqual([]);
    expect(alignText([], [])).toEqual([]);
  });

  it("keeps all units of the text if the other text only adds a word", () => {
    const random = createRandom(43);
    for (let run = 0; run < 100; run++) {
      const words = Array.from({ length: 1 + random.int(8) }, () =>
        random.pick(["one", "two", "three", "four", "x"]),
      );
      const at = random.int(words.length + 1);
      const longer = [...words.slice(0, at), "new", ...words.slice(at)];
      const a = words.join(" ");
      const b = longer.join(" ");
      // Each character of `a` stays.
      expect(alignText(units(a), units(b))).toHaveLength(Array.from(a).length);
    }
  });
});

describe("alignText: edge cases", () => {
  it("uses the character matches of a gap if they cover exactly half of it", () => {
    // "ab" and "ac" are two different words: one gap of 4 units with one
    // match. 2 * 1 is half of 4: the match stays.
    expect(kept("ab", "ac")).toBe("a");
  });

  it("does not use the character matches of a gap if they cover less than half of it", () => {
    // One match in a gap of 6 units.
    expect(kept("abc", "axy")).toBe("");
  });

  it("does not split a character outside the Basic Multilingual Plane", () => {
    expect(kept("a😀b", "a😀c")).toBe("a😀");
    expect(kept("😀😁", "😁😀")).toHaveLength(2);
  });

  it("matches words with letters of other scripts as words", () => {
    expect(kept("привет мир", "привет друг")).toBe("привет ");
    // "テキスト" and "テスト" are different words, but the characters of
    // the gap match: 3 matches in 7 units.
    expect(kept("日本語 テキスト", "日本語 テスト")).toBe("日本語 テスト");
  });

  it("aligns a text of only whitespace", () => {
    expect(kept("  ", "  ")).toBe("  ");
    expect(kept(" ", "\n")).toBe("");
  });
});

describe("charKind", () => {
  it("gives the kind of letters, digits, whitespace and other characters", () => {
    expect(["a", "Z", "é", "ж", "日", "5", "_"].map(charKind)).toEqual(
      Array(7).fill("word"),
    );
    expect([" ", "\n", "\t", " ", " "].map(charKind)).toEqual(
      Array(5).fill("space"),
    );
    expect([".", "-", "😀", "@", "\u0000"].map(charKind)).toEqual(
      Array(5).fill("other"),
    );
  });

  it("gives a combining mark the kind `other`: the characters of the word then match in the gap", () => {
    // "e" and U+0301 (a combining acute accent). The decomposed word is two
    // tokens. The character diff of the gap keeps "caf".
    expect(charKind("\u0301")).toBe("other");
    expect(kept("cafe\u0301 noir", "caf\u00e9 noir")).toBe("caf noir");
  });
});
