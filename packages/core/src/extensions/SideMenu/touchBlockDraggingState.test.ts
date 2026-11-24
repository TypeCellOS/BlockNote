import { describe, expect, it } from "vite-plus/test";

import {
  edgeScrollSpeed,
  keyboardAfterResize,
} from "./touchBlockDraggingState.js";

describe("touch drag policy", () => {
  it("ramps scroll speed at either edge and leaves the middle neutral", () => {
    expect(edgeScrollSpeed(100, 100, 400)).toBe(-840);
    expect(edgeScrollSpeed(130, 100, 400)).toBe(-420);
    expect(edgeScrollSpeed(250, 100, 400)).toBe(0);
    expect(edgeScrollSpeed(370, 100, 400)).toBe(420);
    expect(edgeScrollSpeed(400, 100, 400)).toBe(840);
    expect(edgeScrollSpeed(500, 100, 400)).toBe(840);
  });

  it("does not overlap activation bands or scroll a hidden container", () => {
    expect(edgeScrollSpeed(115, 100, 130)).toBe(0);
    expect(edgeScrollSpeed(100, 100, 100)).toBe(0);
    expect(edgeScrollSpeed(100, 200, 100)).toBe(0);
  });

  it("requires an observed keyboard shrink before treating recovery as dismissal", () => {
    const baseline = { type: "unseen" as const, height: 700, width: 400 };
    const viewport = { height: 650, layoutWidth: 400, scale: 1 };
    expect(keyboardAfterResize(baseline, viewport)).toEqual(baseline);
    const visible = keyboardAfterResize(baseline, {
      ...viewport,
      height: 400,
    })!;
    expect(visible.type).toBe("visible");
    expect(
      keyboardAfterResize(visible, { ...viewport, height: 700 }),
    ).toBeUndefined();
  });

  it("ignores zoom and resets observation on orientation changes without ending editing", () => {
    const visible = { type: "visible" as const, height: 700, width: 400 };
    expect(
      keyboardAfterResize(visible, { height: 350, layoutWidth: 400, scale: 2 }),
    ).toBe(visible);
    expect(
      keyboardAfterResize(visible, { height: 400, layoutWidth: 700, scale: 1 }),
    ).toEqual({ type: "unseen", height: 400, width: 700 });
  });
});
