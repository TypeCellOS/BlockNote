import { expect, it } from "vite-plus/test";

import { observeVirtualKeyboard } from "./virtualKeyboard.js";

it("uses the tallest viewport and distinguishes keyboard-sized shrink from browser chrome", () => {
  const baseline = observeVirtualKeyboard(undefined, {
    height: 700,
    layoutWidth: 400,
    scale: 1,
  });
  expect(
    observeVirtualKeyboard(baseline, {
      height: 620,
      layoutWidth: 400,
      scale: 1,
    }).open,
  ).toBe(false);
  const open = observeVirtualKeyboard(baseline, {
    height: 400,
    layoutWidth: 400,
    scale: 1,
  });
  expect(open.open).toBe(true);
  expect(
    observeVirtualKeyboard(open, {
      height: 700,
      layoutWidth: 400,
      scale: 1,
    }).open,
  ).toBe(false);
});

it("normalizes pinch zoom and resets the baseline only on a large layout-width change", () => {
  const baseline = { height: 700, width: 400, open: false };
  expect(
    observeVirtualKeyboard(baseline, {
      height: 350,
      layoutWidth: 400,
      scale: 2,
    }).open,
  ).toBe(false);
  expect(
    observeVirtualKeyboard(baseline, {
      height: 400,
      layoutWidth: 402,
      scale: 1,
    }),
  ).toEqual({ height: 700, width: 400, open: true });
  expect(
    observeVirtualKeyboard(baseline, {
      height: 400,
      layoutWidth: 700,
      scale: 1,
    }),
  ).toEqual({ height: 400, width: 700, open: false });
});
