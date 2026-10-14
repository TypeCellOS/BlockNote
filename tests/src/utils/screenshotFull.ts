import { page } from "./context.js";
import { expectElement } from "./editor.js";

/**
 * Screenshots an element that may be taller than the browser window, at full
 * resolution.
 *
 * Grow the viewport so content below the fold paints before capture. A fixed
 * height also lets different renders use identical screenshot bounds. Vitest 5
 * resizes the browser with its test iframe, so no harness DOM changes are needed.
 * screenshotFull.test.tsx verifies that tall content remains visible.
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
      style?: string;
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
