import type {
  BrowserContext,
  Frame,
  FrameLocator,
  Page,
} from "@playwright/test";
import type { BrowserCommand } from "vite-plus/test/node";

// Vite+ overrides `BrowserCommandContext` with itself, but for some reason it uses:
// `declate module "vitest/node"`
// So not applicable when importing from "vite-plus/test/node", which is what should actually be
// done when using Vite+.
declare module "vite-plus/test/node" {
  interface BrowserCommandContext {
    page: Page;
    frame(): Promise<Frame>;
    iframe: FrameLocator;
    context: BrowserContext;
  }
}

export type MouseAction =
  | { type: "move"; x: number; y: number; steps?: number }
  | { type: "down" }
  | { type: "up" }
  | { type: "click"; x: number; y: number; clickCount?: number };

/**
 * Performs real mouse actions at coordinates relative to the test iframe's
 * viewport, correcting for the iframe's position in the outer browser page.
 * Use for dragging, hit-testing, or movement across multiple steps where a
 * locator's `.click()`/`.hover()` cannot express the interaction. Prefer locators
 * for ordinary control activation so tests do not depend on layout coordinates.
 *
 * Actions are positional arguments, not an array. `down` and `up` use the current
 * mouse position; `move` supports intermediate steps and `click` a click count.
 * Coordinates from `element().getBoundingClientRect()` are in the expected space.
 * This is mouse input, not touch emulation. Requires the shared Node registration.
 *
 * @example
 * const box = handle.element().getBoundingClientRect();
 * const x = box.left + box.width / 2;
 * const y = box.top + box.height / 2;
 * await positionalMouse(
 *   { type: "move", x, y },
 *   { type: "down" },
 *   { type: "move", x: x + 100, y, steps: 10 },
 *   { type: "up" },
 * );
 */
export const positionalMouse: BrowserCommand<MouseAction[]> = async (
  // eslint-disable-next-line typescript/unbound-method -- destructuring page/frame from parameter object, not a class
  { page, frame },
  ...actions
) => {
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
};
