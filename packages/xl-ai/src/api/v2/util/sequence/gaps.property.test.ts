// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import { createRandom } from "../../testUtil/random.js";
import { gaps, isChanged } from "./gaps.js";
import type { MatchedPair } from "./types.js";

/** Random pairs in order, without crossings, for lists of the given lengths. */
function randomPairs(
  random: ReturnType<typeof createRandom>,
  aLength: number,
  bLength: number,
): MatchedPair[] {
  const pairs: MatchedPair[] = [];
  let aIndex = random.int(3);
  let bIndex = random.int(3);
  while (aIndex < aLength && bIndex < bLength) {
    if (random.chance(0.6)) {
      pairs.push({ aIndex, bIndex });
    }
    aIndex += 1 + random.int(2);
    bIndex += 1 + random.int(2);
  }
  return pairs;
}

describe("gaps: properties", () => {
  it("covers each index of the two lists one time: in a gap or as an anchor", () => {
    const random = createRandom(31);
    for (let run = 0; run < 300; run++) {
      const aLength = random.int(15);
      const bLength = random.int(15);
      const pairs = randomPairs(random, aLength, bLength);
      const result = gaps(pairs, aLength, bLength);

      expect(result).toHaveLength(pairs.length + 1);
      expect(result.map((gap) => gap.anchor)).toEqual([...pairs, undefined]);
      const coveredA: number[] = [];
      const coveredB: number[] = [];
      for (const gap of result) {
        expect(gap.aStart).toBeLessThanOrEqual(gap.aEnd);
        expect(gap.bStart).toBeLessThanOrEqual(gap.bEnd);
        for (let i = gap.aStart; i < gap.aEnd; i++) {
          coveredA.push(i);
        }
        for (let j = gap.bStart; j < gap.bEnd; j++) {
          coveredB.push(j);
        }
        if (gap.anchor) {
          coveredA.push(gap.anchor.aIndex);
          coveredB.push(gap.anchor.bIndex);
        }
        expect(isChanged(gap)).toBe(
          gap.aEnd > gap.aStart || gap.bEnd > gap.bStart,
        );
      }
      expect(coveredA).toEqual(Array.from({ length: aLength }, (_, i) => i));
      expect(coveredB).toEqual(Array.from({ length: bLength }, (_, i) => i));
    }
  });

  it("gives one empty gap for two empty lists", () => {
    const [gap] = gaps([], 0, 0);
    expect(gap).toEqual({
      aStart: 0,
      aEnd: 0,
      bStart: 0,
      bEnd: 0,
      anchor: undefined,
    });
    expect(isChanged(gap)).toBe(false);
  });

  it("gives an empty last gap if the last pair is at the two ends", () => {
    const result = gaps([{ aIndex: 2, bIndex: 0 }], 3, 1);
    expect(result.at(-1)).toEqual({
      aStart: 3,
      aEnd: 3,
      bStart: 1,
      bEnd: 1,
      anchor: undefined,
    });
  });
});
