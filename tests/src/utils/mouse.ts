import { triggerCommand } from "./context.js";
import { DRAG_HANDLE_SELECTOR } from "./const.js";
import { sleep, waitForSelector } from "./editor.js";
import type { MouseAction } from "./positionalMouse.js";

// `positionalMouse` is registered as a browser command in vite.config.browser.ts.
// `import type` above keeps the (Node-only) command module out of the browser bundle.
function runMouse(actions: MouseAction[]): Promise<void> {
  return triggerCommand("positionalMouse", actions);
}

/** Bounding rect of an element, resolved from a selector or the element itself. */
export function getRect(selectorOrElement: string | Element): DOMRect {
  const element =
    typeof selectorOrElement === "string"
      ? document.querySelector(selectorOrElement)
      : selectorOrElement;
  if (!element) {
    throw new Error(`Element not found: ${JSON.stringify(selectorOrElement)}`);
  }
  return element.getBoundingClientRect();
}

function center(rect: DOMRect) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/**
 * Drives the real Playwright mouse through a sequence of actions. Coordinates
 * are iframe-relative (i.e. `getBoundingClientRect()` space) — see `getRect`.
 */
export function mouseSequence(actions: MouseAction[]): Promise<void> {
  return runMouse(actions);
}

/** Single (or multi-) click at iframe-relative coordinates. */
export function clickAt(x: number, y: number, clickCount = 1): Promise<void> {
  return runMouse([{ type: "click", x, y, clickCount }]);
}

/** Moves the mouse to the centre of an element (e.g. to reveal hover UI). */
export async function moveMouseOverElement(
  selectorOrElement: string | Element,
) {
  const element =
    typeof selectorOrElement === "string"
      ? await waitForSelector(selectorOrElement)
      : selectorOrElement;
  const { x, y } = center(element.getBoundingClientRect());
  await runMouse([{ type: "move", x, y, steps: 5 }]);
}

/**
 * Drags a block onto another via its drag handle. Hovers the drag target to
 * reveal the handle, presses on the handle, then drops on the left edge
 * (`dropAbove`) or right edge of the drop target.
 */
export async function dragAndDropBlock(
  dragTarget: string | Element,
  dropTarget: string | Element,
  dropAbove: boolean,
) {
  await moveMouseOverElement(dragTarget);
  await sleep(100);

  const handle = await waitForSelector(DRAG_HANDLE_SELECTOR);
  const handleCenter = center(handle.getBoundingClientRect());
  await runMouse([
    { type: "move", x: handleCenter.x, y: handleCenter.y, steps: 5 },
  ]);
  await sleep(100);
  await runMouse([{ type: "down" }]);
  await sleep(100);

  const dropRect = getRect(dropTarget);
  const dropCoords = dropAbove
    ? { x: dropRect.x + 1, y: dropRect.y + dropRect.height / 2 }
    : {
        x: dropRect.x + dropRect.width - 1,
        y: dropRect.y + dropRect.height / 2,
      };
  await runMouse([
    { type: "move", x: dropCoords.x, y: dropCoords.y, steps: 5 },
    { type: "up" },
  ]);
}
