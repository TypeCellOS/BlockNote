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
  | { type: "move"; x: number; y: number; steps?: number; owner?: string }
  | { type: "down"; owner?: string }
  | { type: "up"; owner?: string }
  | { type: "cancel"; owner: string }
  | { type: "click"; x: number; y: number; clickCount?: number };

type HeldButton = { owner?: string; moved: boolean };

// Playwright's mouse belongs to the outer page, not the tester iframe. Only
// the command that acquired the button can cancel it during test teardown.
const heldButtons = new WeakMap<Page, HeldButton>();
const pendingBatches = new WeakMap<Page, Promise<void>>();

/**
 * Performs real mouse actions at coordinates relative to the test iframe's
 * viewport, correcting for the iframe's position in the outer browser page.
 * Use for dragging, hit-testing, or movement across multiple steps where a
 * locator's `.click()`/`.hover()` cannot express the interaction. Prefer locators
 * for ordinary control activation so tests do not depend on layout coordinates.
 *
 * Actions are positional arguments, not an array. `down` and `up` use the current
 * mouse position; `move` supports intermediate steps and `click` a click count.
 * A matching `cancel` aborts an owned drag and releases its button. A plain
 * `up` explicitly releases the button and disarms any pending cancellation.
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
  // A timeout can trigger teardown while the start batch is still in flight.
  // Order cancellation after it so cleanup cannot miss a late mouse down.
  const batch = (pendingBatches.get(page) ?? Promise.resolve()).then(() =>
    runBatch(page, frame, actions),
  );
  pendingBatches.set(
    page,
    batch.then(
      () => {},
      () => {},
    ),
  );
  await batch;
};

async function runBatch(
  page: Page,
  frame: () => Promise<Frame>,
  actions: MouseAction[],
) {
  let offsetX = 0;
  let offsetY = 0;
  // Button-only batches act at the current pointer position, even if the
  // iframe is no longer visible. Preflight any coordinate batch before input.
  if (actions.some(({ type }) => type === "move" || type === "click")) {
    const testFrame = await frame();
    const frameElement = await testFrame.frameElement();
    const frameBox = await frameElement.boundingBox();
    if (!frameBox) {
      throw new Error("Cannot position the mouse: tester iframe has no box.");
    }
    offsetX = frameBox.x;
    offsetY = frameBox.y;
  }

  for (const action of actions) {
    const held = heldButtons.get(page);
    switch (action.type) {
      case "move":
        if (action.owner !== undefined && action.owner !== held?.owner) {
          throw new Error("The drag no longer owns the positional mouse.");
        }
        if (held?.owner !== undefined) {
          held.moved = true;
        }
        await page.mouse.move(offsetX + action.x, offsetY + action.y, {
          steps: action.steps ?? 1,
        });
        break;
      case "down":
        if (held && (held.owner !== undefined || action.owner !== undefined)) {
          throw new Error("The positional mouse button is already held.");
        }
        // Record ownership before dispatch: a rejected driver call may already
        // have marked the button pressed.
        heldButtons.set(page, { owner: action.owner, moved: false });
        await page.mouse.down();
        break;
      case "up":
        if (action.owner !== undefined && action.owner !== held?.owner) {
          throw new Error("The drag no longer owns the positional mouse.");
        }
        await page.mouse.up();
        heldButtons.delete(page);
        break;
      case "cancel":
        if (held?.owner !== action.owner) {
          break;
        }
        try {
          if (held.moved) {
            // Mouse-up alone would drop at the last position.
            await page.keyboard.press("Escape");
          }
        } finally {
          await page.mouse.up();
          heldButtons.delete(page);
        }
        break;
      case "click":
        if (held?.owner !== undefined) {
          throw new Error("Release the active drag before clicking.");
        }
        await page.mouse.click(offsetX + action.x, offsetY + action.y, {
          clickCount: action.clickCount ?? 1,
        });
        heldButtons.delete(page);
        break;
    }
  }
}
