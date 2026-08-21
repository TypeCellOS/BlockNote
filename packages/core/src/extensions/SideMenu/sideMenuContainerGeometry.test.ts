// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import {
  rectIndexAtCursor,
  rectsAreSideBySide,
  type BlockRect,
} from "./sideMenuContainerGeometry.js";

// The arithmetic half of the side-menu container geometry: pure functions over
// rects, so there is nothing to stub and no DOM to build. These used to be
// tested through the DOM adapters with `getBoundingClientRect` monkey-patched
// onto detached elements — which faked the one input the module exists to read.
// The adapters (and the claim that a real column list really does lay its
// children out side-by-side) are covered against real layout in
// `sideMenuContainerGeometry.browser.test.ts`.

const rect = (
  top: number,
  bottom: number,
  left: number,
  right: number,
): BlockRect => ({ top, bottom, left, right });

// Two columns of a column list: same vertical band, adjacent horizontally.
const SIDE_BY_SIDE = [rect(0, 100, 0, 100), rect(0, 100, 100, 200)];
// Two blocks of a callout: same horizontal band, stacked vertically with a gap
// between them (the abutting, gap-free case is its own test below).
const STACKED = [rect(0, 40, 0, 200), rect(50, 90, 0, 200)];

describe("rectsAreSideBySide", () => {
  it("is true when two rects overlap vertically", () => {
    expect(rectsAreSideBySide(SIDE_BY_SIDE)).toBe(true);
  });

  it("is false when rects are stacked", () => {
    expect(rectsAreSideBySide(STACKED)).toBe(false);
  });

  it("is false for a single rect", () => {
    expect(rectsAreSideBySide([rect(0, 100, 0, 100)])).toBe(false);
  });

  it("is false for no rects at all", () => {
    expect(rectsAreSideBySide([])).toBe(false);
  });

  it("treats abutting (non-overlapping) rects as stacked", () => {
    // The second rect's top exactly meets the first's bottom — a stack with no
    // gap must not be misread as a row.
    expect(
      rectsAreSideBySide([rect(0, 40, 0, 200), rect(40, 80, 0, 200)]),
    ).toBe(false);
  });

  it("finds an overlapping pair that isn't the first two", () => {
    // The loop is over every pair, not just neighbours: a column list whose
    // first two children happen to be stacked is still a row.
    expect(
      rectsAreSideBySide([
        rect(0, 40, 0, 100),
        rect(40, 80, 0, 100),
        rect(40, 80, 100, 200),
      ]),
    ).toBe(true);
  });

  it("counts even a one-pixel vertical overlap", () => {
    expect(
      rectsAreSideBySide([rect(0, 41, 0, 100), rect(40, 80, 0, 100)]),
    ).toBe(true);
  });
});

describe("rectIndexAtCursor", () => {
  it("returns the rect whose x range contains the cursor (side-by-side)", () => {
    // Both rects share the y range, so only x distinguishes them. x=150 lands
    // in the second: the vertical-only fallback recorded for the first must not
    // win over an x match found later in the list. This is what makes hovering
    // the second column of a row resolve to it rather than to its neighbour.
    expect(rectIndexAtCursor(SIDE_BY_SIDE, { x: 150, y: 50 })).toBe(1);
  });

  it("prefers the x match over the first vertical match", () => {
    // The mirror of the above: x=10 is within the first rect.
    expect(rectIndexAtCursor(SIDE_BY_SIDE, { x: 10, y: 50 })).toBe(0);
  });

  it("falls back to the first vertical match when x is in the gutter", () => {
    // The cursor's y is in the first block's band but its x is left of it (the
    // side-menu gutter). The first vertical match wins.
    expect(rectIndexAtCursor(STACKED, { x: -20, y: 20 })).toBe(0);
  });

  it("returns undefined when the cursor is below every rect", () => {
    expect(rectIndexAtCursor(STACKED, { x: 10, y: 999 })).toBeUndefined();
  });

  it("returns undefined when the cursor is above every rect", () => {
    expect(rectIndexAtCursor(STACKED, { x: 10, y: -999 })).toBeUndefined();
  });

  it("returns undefined for no rects at all", () => {
    expect(rectIndexAtCursor([], { x: 10, y: 10 })).toBeUndefined();
  });

  it("includes the rect edges", () => {
    const single = [rect(0, 40, 0, 200)];
    expect(rectIndexAtCursor(single, { x: 0, y: 0 })).toBe(0);
    expect(rectIndexAtCursor(single, { x: 200, y: 40 })).toBe(0);
  });
});
