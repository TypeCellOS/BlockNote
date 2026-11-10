import { page } from "./context.js";
import { expectElement } from "./editor.js";

/**
 * Screenshots an element that may be taller than the browser window, at full
 * resolution.
 *
 * Grow the tester iframe so it paints the complete element. Vitest 5 handles
 * removing the iframe's fit-to-window transform during capture, so this helper
 * only manages the capture height and restores the suite's default viewport.
 * A fixed height also lets the static-rendering equality test compare renders
 * whose content heights differ slightly against the same baseline.
 */
export async function screenshotFull(
  element: HTMLElement,
  name: string,
  options?: {
    /**
     * Fixed capture height instead of measuring the element. Required when
     * two different renders are compared against one baseline (e.g. the
     * static-rendering equality test): measured heights differ by a few px
     * between renders, and a dimension mismatch fails before pixels are even
     * compared. Pass `document.documentElement` as the element then - its box
     * is the (grown) iframe viewport, so the dimensions are exact.
     */
    height?: number;
    comparatorOptions?: {
      allowedMismatchedPixelRatio?: number;
      allowedMismatchedPixels?: number;
    };
    screenshotOptions?: {
      scale?: "css" | "device";
      mask?: readonly unknown[];
    };
  },
) {
  const height =
    options?.height ??
    Math.max(720, Math.ceil(element.getBoundingClientRect().bottom) + 40);
  await page.viewport(1280, height);
  try {
    await expectElement(element).toMatchScreenshot(name, {
      ...(options?.comparatorOptions && {
        comparatorOptions: options.comparatorOptions,
      }),
      ...(options?.screenshotOptions && {
        screenshotOptions: options.screenshotOptions,
      }),
    } as never);
  } finally {
    await page.viewport(1280, 720);
  }
}
