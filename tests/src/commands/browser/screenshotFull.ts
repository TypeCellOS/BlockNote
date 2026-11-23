import { expect, onTestFinished } from "vite-plus/test";
import { page } from "../transport.js";

/** Keep a fixture at the requested size through the end of its test. */
export async function resizeViewportForTest(width: number, height: number) {
  const { innerWidth, innerHeight } = window;
  let resize: Promise<void> | undefined;
  onTestFinished(async () => {
    // If the test timed out during resize, don't let the pending command
    // race the restore. The fixture already awaits and reports its rejection.
    await resize?.catch(() => undefined);
    await page.viewport(innerWidth, innerHeight);
  });
  resize = page.viewport(width, height);
  await resize;
}

/** Keep a series of captures at one size, then restore the caller's viewport. */
export async function withScreenshotViewport(
  height: number,
  capture: () => Promise<void>,
) {
  const { innerWidth, innerHeight } = window;
  const needsResize = innerWidth !== 1280 || innerHeight !== height;
  try {
    if (needsResize) {
      await page.viewport(1280, height);
    }
    await capture();
  } finally {
    if (
      needsResize ||
      window.innerWidth !== innerWidth ||
      window.innerHeight !== innerHeight
    ) {
      await page.viewport(innerWidth, innerHeight);
    }
  }
}

/**
 * Screenshots an element that may be taller than the browser window, at full
 * resolution.
 *
 * Grow the tester iframe so it paints the complete element. Vitest 5 handles
 * removing the iframe's fit-to-window transform during capture, so this helper
 * only manages the capture height and restores the caller's viewport.
 * A fixed height also lets the static-rendering equality test compare renders
 * whose content heights differ slightly against the same baseline.
 *
 * Use for deliberate full-height visual baselines after fonts, media, and layout
 * are ready, not as a substitute for state or accessibility assertions.
 *
 * @example
 * it("renders a tall document", async ({ page, screenshotFull }) => {
 *   await screenshotFull(page.getByRole("textbox").element(), "tall-document");
 * });
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
  await withScreenshotViewport(height, async () => {
    await expect.element(element).toMatchScreenshot(name, {
      ...(options?.comparatorOptions && {
        comparatorOptions: options.comparatorOptions,
      }),
      ...(options?.screenshotOptions && {
        screenshotOptions: options.screenshotOptions,
      }),
    } as never);
  });
}
