import { describe, expect, test, vi } from "vite-plus/test";

import {
  resizeViewportForTest,
  withScreenshotViewport,
} from "../../commands/browser/screenshotFull.js";
import { page } from "../../utils/context.js";
import { screenshotFull } from "../../utils/screenshotFull.js";

function viewportSize() {
  return [window.innerWidth, window.innerHeight];
}

// Guards the capture utility itself, on synthetic content: screenshotFull
// depends on harness DOM internals (see its doc comment), and a harness
// update that breaks them would otherwise only surface as confusing
// failures in the feature tests using it. Numbered stripes make the failure
// modes obvious in the diff: a plain capture blanks out below ~712px, a
// viewport-only capture comes out downscaled to ~0.14x - the baseline
// proves the full 600x2000 render.
describe("screenshotFull", () => {
  test(
    "captures a tall element completely at full resolution",
    { timeout: 30000 },
    async ({ onTestFinished }) => {
      const frame = document.createElement("div");
      frame.style.width = "600px";
      frame.style.background = "white";
      for (let i = 0; i < 40; i++) {
        const stripe = document.createElement("div");
        stripe.textContent = `stripe ${i} - starts at y = ${i * 50}px`;
        stripe.style.height = "50px";
        stripe.style.font = "20px sans-serif";
        stripe.style.background = i % 2 ? "#e3f2fd" : "#fff3e0";
        frame.append(stripe);
      }
      document.body.append(frame);
      onTestFinished(() => frame.remove());
      const originalViewport = viewportSize();
      const callerViewport = [1000, 800] as const;
      // Finish hooks unwind in reverse order, so this runs after restoration.
      onTestFinished(() => expect(viewportSize()).toEqual(originalViewport));
      // The stripes are fixed-size, so changing the caller's viewport does
      // not change the geometry of the full-resolution capture.
      await resizeViewportForTest(...callerViewport);
      await screenshotFull(frame, "screenshot-full-tall-element");
      expect(viewportSize()).toEqual(callerViewport);
    },
  );

  test("restores each caller's viewport when a nested capture fails", async () => {
    const callerViewport = [1000, 800] as const;
    await resizeViewportForTest(...callerViewport);
    const captureFailure = new Error("capture failed");

    await expect(
      withScreenshotViewport(920, async () => {
        expect(viewportSize()).toEqual([1280, 920]);
        await expect(
          withScreenshotViewport(1120, async () => {
            expect(viewportSize()).toEqual([1280, 1120]);
            throw captureFailure;
          }),
        ).rejects.toBe(captureFailure);
        expect(viewportSize()).toEqual([1280, 920]);
        throw captureFailure;
      }),
    ).rejects.toBe(captureFailure);

    expect(viewportSize()).toEqual(callerViewport);
  });

  test("restores the caller's viewport when the resize applies then rejects", async () => {
    const callerViewport = [1000, 800] as const;
    await resizeViewportForTest(...callerViewport);
    const resizeFailure = new Error("viewport resize failed");
    const resize = page.viewport.bind(page);
    const viewport = vi
      .spyOn(page, "viewport")
      .mockImplementationOnce(async (width, height) => {
        await resize(width, height);
        throw resizeFailure;
      });
    const capture = vi.fn(async () => undefined);

    try {
      await expect(withScreenshotViewport(920, capture)).rejects.toBe(
        resizeFailure,
      );
      expect(capture).not.toHaveBeenCalled();
      expect(viewportSize()).toEqual(callerViewport);
    } finally {
      viewport.mockRestore();
    }
  });
});
