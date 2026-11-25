import {
  expect,
  onTestFinished as finishCurrentTest,
  type TestContext,
} from "vite-plus/test";
import { commands } from "./context.js";
import { DRAG_HANDLE_SELECTOR } from "./const.js";
import { waitForSelector } from "./editor.js";
import type { MouseAction } from "../commands/transport/positionalMouse.js";

function runMouse(actions: MouseAction[]): Promise<void> {
  return commands.positionalMouse(...actions);
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
 * Starts dragging a block by its drag handle: hovers the block to reveal the
 * handle, presses on it, and moves the mouse a little, so the browser starts
 * the drag. Finish it with `drag.drop(...)` or a raw `mouseSequence` mouse-up.
 * Pass the calling test's cleanup hook before acquiring the native button.
 */
export async function startBlockDrag(
  dragTarget: string | Element,
  onTestFinished: TestContext["onTestFinished"],
) {
  const owner = crypto.randomUUID();
  let started = false;
  let finished = false;

  function cancel() {
    return runMouse([{ type: "cancel", owner }]);
  }

  // Bind to this attempt before any await. If it ends while we are still
  // finding the handle, do not acquire the page's native button afterward.
  onTestFinished(async () => {
    finished = true;
    if (started) {
      await cancel();
    }
  });

  const target =
    typeof dragTarget === "string"
      ? await waitForSelector(dragTarget)
      : dragTarget;
  await moveMouseOverElement(target);

  const handle = await waitForDragHandle(target);
  const handleCenter = center(handle.getBoundingClientRect());
  const previousPreview = document.querySelector(".bn-drag-preview");

  async function cancelAfterFailure() {
    try {
      await cancel();
    } catch {
      // The browser may have disconnected. Report the original drag failure.
    }
  }

  if (finished) {
    throw new Error("The test ended before the drag acquired the mouse.");
  }
  started = true;
  try {
    await runMouse([
      { type: "move", x: handleCenter.x, y: handleCenter.y, steps: 5 },
      { type: "down", owner },
      {
        type: "move",
        x: handleCenter.x + 10,
        y: handleCenter.y + 10,
        steps: 5,
      },
    ]);
    // BlockNote creates this on native dragstart, not on mouse down.
    await expect
      .poll(() => {
        const preview = document.querySelector(".bn-drag-preview");
        return preview !== null && preview !== previousPreview;
      })
      .toBe(true);
  } catch (error) {
    await cancelAfterFailure();
    throw error;
  }

  /** Drops on the target's left edge (`dropAbove`) or right edge. */
  async function drop(dropTarget: string | Element, dropAbove: boolean) {
    try {
      const dropRect = getRect(dropTarget);
      const x = dropAbove ? dropRect.left + 1 : dropRect.right - 1;
      const y = dropRect.top + dropRect.height / 2;
      await runMouse([
        { type: "move", x, y, steps: 5, owner },
        { type: "up", owner },
      ]);
    } catch (error) {
      await cancelAfterFailure();
      throw error;
    }
  }

  return { drop };
}

const BLOCK_ID_SELECTOR = "[data-node-type][data-id]";
const BLOCK_OUTER_SELECTOR = '[data-node-type="blockOuter"]';
const BLOCK_ROOT_SELECTOR = `${BLOCK_ID_SELECTOR}:not(${BLOCK_OUTER_SELECTOR})`;

/** Waits for the hovered block's own handle to be positioned on its row. */
export async function waitForDragHandle(target: Element) {
  const targetBlock = target.closest(BLOCK_ID_SELECTOR);
  const blockId = targetBlock?.getAttribute("data-id");
  const container = target.closest(".bn-container");
  if (!targetBlock || !blockId || !container) {
    throw new Error("The drag handle target must belong to an editor block.");
  }

  const idSelector = `[data-id="${CSS.escape(blockId)}"]`;
  const handleSelector = `${DRAG_HANDLE_SELECTOR}[data-side-menu-block-id="${CSS.escape(blockId)}"]`;
  const block = targetBlock.matches(BLOCK_OUTER_SELECTOR)
    ? targetBlock.querySelector(`${BLOCK_ROOT_SELECTOR}${idSelector}`)
    : targetBlock;
  if (!block || block.closest(".bn-container") !== container) {
    throw new Error(
      `Could not resolve the drag handle target block ${blockId}.`,
    );
  }

  function findHandle(block: Element, container: Element) {
    // A regular block's box includes its children. Find its own content row,
    // even when a toggle or another frame wraps that row. Layout blocks have
    // no content row of their own; the handle's block ID disambiguates them.
    const row = block.matches('[data-node-type="blockContainer"]')
      ? [...block.querySelectorAll(".bn-block-content")].find(
          (content) =>
            content.closest(BLOCK_ROOT_SELECTOR) === block &&
            content.closest(".bn-container") === container,
        )
      : block;
    if (!row) {
      return undefined;
    }
    const { top, bottom } = row.getBoundingClientRect();
    return [...container.querySelectorAll(handleSelector)].find((handle) => {
      if (handle.closest(".bn-container") !== container) {
        return false;
      }
      const { x, y } = center(handle.getBoundingClientRect());
      const button = handle.closest("button") ?? handle;
      return (
        y >= top &&
        y <= bottom &&
        button.contains(document.elementFromPoint(x, y))
      );
    });
  }

  let handle: Element | undefined;
  await expect
    .poll(() => (handle = findHandle(block, container)))
    .toBeDefined();
  return handle!;
}

/**
 * Drags a block onto another via its drag handle. Hovers the drag target to
 * reveal the handle, presses on the handle, then drops on the left edge
 * (`dropAbove`) or right edge of the drop target. Uses the current test's
 * finish hook by default; pass the bound hook if calling from a shared fixture.
 */
export async function dragAndDropBlock(
  dragTarget: string | Element,
  dropTarget: string | Element,
  dropAbove: boolean,
  onTestFinished: TestContext["onTestFinished"] = finishCurrentTest,
) {
  const drag = await startBlockDrag(dragTarget, onTestFinished);
  await drag.drop(dropTarget, dropAbove);
}
