import { page } from "./context.js";
import { expectElement } from "./editor.js";

/**
 * Screenshots an element that may be taller than the browser window, at full
 * resolution.
 *
 * Plain element screenshots only contain what the tester iframe actually
 * paints: anything below its ~720px fold comes out blank white, silently.
 * Growing the iframe first (`page.viewport`) makes it paint everything, but
 * the harness then scales the iframe down to fit the window via a CSS
 * transform on its wrapper, and the capture shrinks with it (static.test.tsx
 * documents accepting that trade-off). So this grows the iframe past the
 * content and neutralizes the wrapper's scale transform (same origin) for
 * the duration of the capture - Playwright captures beyond the window fine.
 *
 * This reaches into harness DOM internals, but it is exactly what upstream
 * Vitest does since the fix for vitest-dev/vitest#9124 / #9363: during
 * captures, PR vitest-dev/vitest#9745 (milestone 5.0.0) un-scales the
 * iframe and resizes the headless viewport to the screenshot. Delete this
 * util once vite-plus ships Vitest 5's browser mode. If an upgrade changes
 * the wrapper DOM before then, captures come out downscaled and fail the
 * baselines' dimension checks - loudly, not silently;
 * screenshotFull.test.tsx isolates that breakage on synthetic content.
 */
export async function screenshotFull(element: HTMLElement, name: string) {
  const height = Math.max(
    720,
    Math.ceil(element.getBoundingClientRect().bottom) + 40,
  );
  await page.viewport(1280, height);
  (window.frameElement?.parentElement as HTMLElement | null)?.style.setProperty(
    "transform",
    "none",
  );
  try {
    await expectElement(element).toMatchScreenshot(name);
  } finally {
    // Re-lays-out the wrapper, including its transform.
    await page.viewport(1280, 720);
  }
}
