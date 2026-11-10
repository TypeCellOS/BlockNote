import { describe, expect, it } from "vite-plus/test";

import { isHeadingToMenu } from "./sideMenuHover.js";

// A menu left of and above the exit point, as for a block's side menu when
// the pointer leaves the block at its bottom left.
const menu = { left: 0, top: 0, right: 40, bottom: 20 };
const exit = { x: 60, y: 60 };

describe("isHeadingToMenu", () => {
  it("accepts points on the way from the exit point to the menu", () => {
    expect(isHeadingToMenu({ x: 50, y: 40 }, exit, menu)).toBe(true);
    expect(isHeadingToMenu({ x: 20, y: 10 }, exit, menu)).toBe(true);
  });

  it("accepts a steep move just outside the hull's tip", () => {
    // The hull's edge from the exit point to the menu's bottom left corner
    // has y ≈ 54.7 at x = 52; (52, 56) is ~1.1px below it.
    expect(isHeadingToMenu({ x: 52, y: 56 }, exit, menu)).toBe(true);
  });

  it("rejects points further than the buffer from the hull", () => {
    expect(isHeadingToMenu({ x: 40, y: 55 }, exit, menu)).toBe(false);
  });

  it("rejects moves away from the menu, even next to the exit point", () => {
    expect(isHeadingToMenu({ x: 60, y: 61 }, exit, menu)).toBe(false);
    expect(isHeadingToMenu({ x: 61, y: 60 }, exit, menu)).toBe(false);
  });

  it("rejects every point once the exit point is on the menu", () => {
    expect(isHeadingToMenu({ x: 30, y: 24 }, { x: 30, y: 19 }, menu)).toBe(
      false,
    );
  });
});
