import type { Frame, Page } from "playwright";
import { defineBrowserCommand } from "vite-plus/test/browser/providers/playwright";

// The Playwright provider augments the command context with `page`/`frame`/etc,
// but that augmentation isn't reflected in this build's exported types, so we
// type the context locally.
type PlaywrightCommandContext = { page: Page; frame(): Promise<Frame> };

/**
 * A single low-level mouse action. Coordinates are **relative to the test
 * iframe's viewport** — i.e. the same coordinate space as `getBoundingClientRect()`
 * inside the test — so call sites can keep the exact pixel math the old
 * Playwright `boundingBox()`-based helpers used.
 */
export type MouseAction =
  | { type: "move"; x: number; y: number; steps?: number }
  | { type: "down" }
  | { type: "up" }
  | { type: "click"; x: number; y: number; clickCount?: number };

/**
 * Drives the real Playwright mouse for interactions that Vitest's `userEvent`
 * can't express: coordinate-precise clicks, block drag-and-drop, and resize
 * drags.
 *
 * Vitest Browser Mode runs the test inside an `<iframe>`, but `page.mouse`
 * operates in top-level page coordinates. We resolve the iframe's offset once
 * and add it to every coordinate, so callers work purely in iframe-relative
 * coordinates.
 */
// Explicit annotation (rather than the inferred `BrowserCommand` type, which
// references a non-portable internal path and trips TS2742 under `declaration`).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MouseCommand = (context: any, actions: MouseAction[]) => Promise<void>;

export const playwrightMouse: MouseCommand = defineBrowserCommand<
  [actions: MouseAction[]]
>(async (context, actions) => {
  const { page, frame } = context as unknown as PlaywrightCommandContext;
  const testFrame = await frame();
  const frameElement = await testFrame.frameElement();
  const frameBox = await frameElement.boundingBox();
  const offsetX = frameBox?.x ?? 0;
  const offsetY = frameBox?.y ?? 0;

  for (const action of actions) {
    switch (action.type) {
      case "move":
        await page.mouse.move(offsetX + action.x, offsetY + action.y, {
          steps: action.steps ?? 1,
        });
        break;
      case "down":
        await page.mouse.down();
        break;
      case "up":
        await page.mouse.up();
        break;
      case "click":
        await page.mouse.click(offsetX + action.x, offsetY + action.y, {
          clickCount: action.clickCount ?? 1,
        });
        break;
    }
  }
});
