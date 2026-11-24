import { describe, expect, it } from "vite-plus/test";

import { createRandom, type Random } from "../testUtil/random.js";
import { textOverlaps, wordSize } from "./overlap.js";

const WORDS = [
  "alpha",
  "Beta",
  "beta",
  "x",
  "y",
  "café",
  "日本",
  "a1",
  "--",
  "!",
];

function randomText(random: Random): string {
  return Array.from({ length: random.int(5) }, () => random.pick(WORDS)).join(
    random.pick([" ", ", ", "\n"]),
  );
}

describe("textOverlaps: properties", () => {
  it("gives overlaps in order, one for each pair of texts, with sizes that are not larger than the texts", () => {
    const random = createRandom(61);
    for (let run = 0; run < 300; run++) {
      const a = Array.from({ length: random.int(6) }, () => randomText(random));
      const b = Array.from({ length: random.int(6) }, () => randomText(random));
      const overlaps = textOverlaps(a, b);
      const totalA = new Map<number, number>();
      const totalB = new Map<number, number>();
      overlaps.forEach((overlap, i) => {
        expect(overlap.size).toBeGreaterThan(0);
        if (i > 0) {
          const previous = overlaps[i - 1];
          // The pairs come from one diff: they do not cross, and each pair
          // of texts has one overlap.
          expect(overlap.aIndex).toBeGreaterThanOrEqual(previous.aIndex);
          expect(overlap.bIndex).toBeGreaterThanOrEqual(previous.bIndex);
          expect(
            overlap.aIndex !== previous.aIndex ||
              overlap.bIndex !== previous.bIndex,
          ).toBe(true);
        }
        totalA.set(
          overlap.aIndex,
          (totalA.get(overlap.aIndex) ?? 0) + overlap.size,
        );
        totalB.set(
          overlap.bIndex,
          (totalB.get(overlap.bIndex) ?? 0) + overlap.size,
        );
      });
      for (const [index, total] of totalA) {
        expect(total).toBeLessThanOrEqual(wordSize(a[index]));
      }
      for (const [index, total] of totalB) {
        expect(total).toBeLessThanOrEqual(wordSize(b[index]));
      }
    }
  });

  it("gives a text the full overlap with an equal text, if the two lists are equal", () => {
    const random = createRandom(62);
    for (let run = 0; run < 200; run++) {
      const a = Array.from({ length: 1 + random.int(5) }, () =>
        randomText(random),
      );
      const index = random.int(a.length);
      const unique = "unique words here";
      a[index] = unique;
      const b = [...a];
      expect(textOverlaps(a, b)).toContainEqual({
        aIndex: index,
        bIndex: index,
        size: wordSize(unique),
      });
    }
  });

  it("gives no overlaps if a list is empty", () => {
    expect(textOverlaps([], ["a"])).toEqual([]);
    expect(textOverlaps(["a"], [])).toEqual([]);
  });
});

describe("wordSize: edge cases", () => {
  it("counts UTF-16 code units of the words, also outside the Basic Multilingual Plane", () => {
    // U+1D400 (a mathematical bold letter) is a letter of two code units.
    expect(wordSize("\u{1d400}")).toBe(2);
    expect(wordSize("日本 語")).toBe(3);
  });

  it("gives 0 for a text with only whitespace or punctuation", () => {
    expect(wordSize("   ")).toBe(0);
    expect(wordSize("-- !")).toBe(0);
  });
});
