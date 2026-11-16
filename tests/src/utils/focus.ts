import type { Locator } from "vite-plus/test/browser";
import { commands, page } from "./context.js";

type FocusTarget =
  | Locator
  | ((locator: Locator) => void | boolean | Promise<void | boolean>);

/**
 * Tabs in the given direction, calling the predicate after each step, until it returns true
 * or the target locator receives focus. The starting element is not visited.
 * Throws if focus cycles, stops moving, or leaves the document first.
 */
export async function focusUntil(
  target: FocusTarget,
  direction: "forward" | "backward" = "forward",
): Promise<Locator> {
  const key = direction === "forward" ? "Tab" : "Shift+Tab";
  const visited = new Set<Element>();
  if (!document.activeElement) {
    throw new Error(`${key}: document.activeElement is null`);
  }
  visited.add(document.activeElement);

  while (true) {
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
}
