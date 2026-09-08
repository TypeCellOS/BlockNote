import { describe, expect, it } from "vite-plus/test";

import {
  rectIndexAtCursor,
  rectsAreSideBySide,
  type BlockRect,
} from "./sideMenuContainerGeometry.js";

// The pure rect arithmetic behind the side menu's container handling: which
// of a container's children the cursor is over, and whether they sit
// side-by-side (a column list) or stacked (a callout). Plain functions over
// plain rects, so they need no DOM - the walks that read real layout live in
// `sideMenuContainerGeometry.browser.test.ts`.

const rect = (
  top: number,
  bottom: number,
  left: number,
  right: number,
): BlockRect => ({ top, bottom, left, right });

// Two columns of a column list: same vertical band, adjacent horizontally.
const SIDE_BY_SIDE = [rect(0, 100, 0, 100), rect(0, 100, 100, 200)];
// Two blocks of a callout: same horizontal band, stacked vertically.
const STACKED = [rect(0, 40, 0, 200), rect(50, 90, 0, 200)];

describe("rectsAreSideBySide", () => {
  it("is true when two rects overlap vertically, false when stacked", () => {
    expect(rectsAreSideBySide(SIDE_BY_SIDE)).toBe(true);
    expect(rectsAreSideBySide(STACKED)).toBe(false);
    // Degenerate inputs are never a row.
    expect(rectsAreSideBySide([rect(0, 100, 0, 100)])).toBe(false);
    expect(rectsAreSideBySide([])).toBe(false);
  });

  it("treats abutting rects as stacked, but counts a one-pixel overlap", () => {
    // The second rect's top exactly meets the first's bottom. A stack with no
    // gap must not be misread as a row.
    expect(
      rectsAreSideBySide([rect(0, 40, 0, 200), rect(40, 80, 0, 200)]),
    ).toBe(false);
    expect(
      rectsAreSideBySide([rect(0, 41, 0, 100), rect(40, 80, 0, 100)]),
    ).toBe(true);
  });

  it("finds an overlapping pair that isn't the first two", () => {
    // The loop is over every pair, not just neighbours. A column list whose
    // first two children happen to be stacked is still a row.
    expect(
      rectsAreSideBySide([
        rect(0, 40, 0, 100),
        rect(40, 80, 0, 100),
        rect(40, 80, 100, 200),
      ]),
    ).toBe(true);
  });
});

describe("rectIndexAtCursor", () => {
  it("returns the rect whose x range contains the cursor (side-by-side)", () => {
    // Both rects share the y range, so only x distinguishes them. The
    // vertical-only fallback recorded for the first must not win over an x
    // match found later in the list; otherwise hovering the second column of
    // a row would resolve to its neighbour.
    expect(rectIndexAtCursor(SIDE_BY_SIDE, { x: 150, y: 50 })).toBe(1);
    expect(rectIndexAtCursor(SIDE_BY_SIDE, { x: 10, y: 50 })).toBe(0);
  });

  it("falls back to the first vertical match when x is in the gutter", () => {
    // The cursor's y is in the first block's band but its x is left of it (the
    // side-menu gutter). The first vertical match wins.
    expect(rectIndexAtCursor(STACKED, { x: -20, y: 20 })).toBe(0);
  });

  it("returns undefined when the cursor misses every rect vertically", () => {
    expect(rectIndexAtCursor(STACKED, { x: 10, y: 999 })).toBeUndefined();
    expect(rectIndexAtCursor(STACKED, { x: 10, y: -999 })).toBeUndefined();
    expect(rectIndexAtCursor([], { x: 10, y: 10 })).toBeUndefined();
  });

  it("includes the rect edges", () => {
    const single = [rect(0, 40, 0, 200)];
    expect(rectIndexAtCursor(single, { x: 0, y: 0 })).toBe(0);
    expect(rectIndexAtCursor(single, { x: 200, y: 40 })).toBe(0);
  });
});
