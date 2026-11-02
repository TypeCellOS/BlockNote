import { expect } from "vite-plus/test";

import type { MatchedPair } from "../diff/types.js";

/** Makes sure that each pair matches equal elements, and that the pairs ascend on the two sides. */
export function expectValidMatching<T>(
  pairs: readonly MatchedPair[],
  a: readonly T[],
  b: readonly T[],
) {
  for (let i = 0; i < pairs.length; i++) {
    expect(a[pairs[i].aIndex]).toEqual(b[pairs[i].bIndex]);
    if (i > 0) {
      expect(pairs[i].aIndex).toBeGreaterThan(pairs[i - 1].aIndex);
      expect(pairs[i].bIndex).toBeGreaterThan(pairs[i - 1].bIndex);
    }
  }
}
