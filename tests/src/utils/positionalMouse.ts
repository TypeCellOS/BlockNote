import type {
  BrowserContext,
  Frame,
  FrameLocator,
  Page,
} from "@playwright/test";
import type {} from "vite-plus/test/browser";
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
 * Vitest's `userEvent` doesn't have several mouse commands that we relied on in Playwright, namely
 * clicking at the current mouse position, and moving the mouse to a given position across N steps.
 *
 * Additionally, Vitest runs component tests in an `iframe`, so any given position needs to be
 * offset, as it should refer to a point within the `iframe` rather then the full page.
 *
 * This function adds that functionality. It must be registered as a command in
 * `vite.config.browser.ts` as that's the only way to have access to the internal Playwright
 * context.
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

// Add command to types, as registering it in `vite.config.browser.ts` isn't enough.
declare module "vite-plus/test/browser" {
  interface BrowserCommands {
    positionalMouse: (...actions: MouseAction[]) => Promise<void>;
  }
}
