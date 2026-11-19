import type { Locator } from "vite-plus/test/browser";
import { commands, page } from "../transport.js";

/**
 * Follows real Tab navigation until a locator is focused or a predicate returns
 * exactly `true`, and returns that step's locator. Use this to verify reachability
 * or record a component's tab order without assuming a fixed number of controls.
 * For a single known key press, use {@link commands.pressKey | pressKey} instead;
 * {@link HTMLElement.focus} bypasses the keyboard navigation this helper exercises.
 *
 * The starting element is not visited. Predicates may await assertions and must
 * return `true` to stop; `false` or `undefined` continues. Throws if focus repeats,
 * stops moving, reaches the document boundary, or exceeds 100 keypresses before
 * the target is found.
 * Establish a starting focus and wait for the relevant UI before calling.
 *
 * @example
 * // Helpers are destructured from the test context.
 * await page.getByRole("textbox").click();
 * await focusUntil(page.getByRole("button", { name: "Bold", exact: true }));
 *
 * @example
 * // Inspect each visited control, stopping once focus leaves the toolbar.
 * await focusUntil(async (active) => {
 *   if (!toolbar.element().contains(active.element())) return true;
 *   await expect.element(active).toBeEnabled();
 *   return false;
 * }, "backward");
 */
export async function focusUntil(
  target:
    | Locator
    | ((locator: Locator) => void | boolean | Promise<void | boolean>),
  direction: "forward" | "backward" = "forward",
): Promise<Locator> {
  const key = direction === "forward" ? "Tab" : "Shift+Tab";
  const visited = new Set<Element>();
  if (!document.activeElement) {
    throw new Error(`${key}: document.activeElement is null`);
  }
  visited.add(document.activeElement);

  for (let presses = 0; presses < 100; presses++) {
    await commands.pressKey(key);
    const active = document.activeElement;
    if (!active) {
      throw new Error(`${key}: document.activeElement is null`);
    }
    if (visited.has(active)) {
      throw new Error(
        `${key}: focus cycled or stopped moving before finding the target`,
      );
    }
    visited.add(active);

    const locator = page.elementLocator(active);
    const found =
      typeof target === "function"
        ? await target(locator)
        : target.query() === active;
    if (found === true) {
      return locator;
    }
    if (active === document.body || active === document.documentElement) {
      throw new Error(`${key}: reached the end of focusable elements`);
    }
  }
  throw new Error(
    `${key}: could not find the focus target after 100 keypresses`,
  );
}
