// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import { gaps, isChanged } from "./gaps.js";

describe("gaps", () => {
  it("gives one gap for lists without pairs", () => {
    expect(gaps([], 2, 3)).toEqual([
      { aStart: 0, aEnd: 2, bStart: 0, bEnd: 3, anchor: undefined },
    ]);
  });

  it("gives the gaps before, between and after the pairs", () => {
    const first = { aIndex: 1, bIndex: 0 };
    const second = { aIndex: 2, bIndex: 3 };
    const result = gaps([first, second], 4, 4);
    expect(result).toEqual([
      { aStart: 0, aEnd: 1, bStart: 0, bEnd: 0, anchor: first },
      { aStart: 2, aEnd: 2, bStart: 1, bEnd: 3, anchor: second },
      { aStart: 3, aEnd: 4, bStart: 4, bEnd: 4, anchor: undefined },
    ]);
    expect(result.map(isChanged)).toEqual([true, true, true]);
  });

  it("gives empty gaps between adjacent pairs", () => {
    const result = gaps(
      [
        { aIndex: 0, bIndex: 0 },
        { aIndex: 1, bIndex: 1 },
      ],
      2,
      2,
    );
    expect(result.map(isChanged)).toEqual([false, false, false]);
  });
});
