import { expect } from "vite-plus/test";
import type { Locator } from "vite-plus/test/browser";

function readFocusOutline(target: Locator) {
  const style = getComputedStyle(target.element());
  return {
    width: Number.parseFloat(style.outlineWidth),
    style: style.outlineStyle,
    color: style.outlineColor,
  };
}

/**
 * Captures an element's unfocused CSS outline and returns a retrying assertion
 * that keyboard focus exposes a different, nonzero, non-hidden, nontransparent
 * outline and `:focus-visible`. The baseline stays private to the callback.
 * Capture before keyboard input; the element must already exist.
 *
 * The callback defaults to the captured locator, or accepts another locator to
 * compare against the same baseline. It can be called repeatedly.
 *
 * Does not move focus, measure contrast, check occlusion, or recognize indicators
 * implemented only with a border or box-shadow. Assert focus alone when testing
 * its destination rather than styling.
 *
 * @example
 * const compareFocusOutline = captureFocusOutline(button);
 * await pressKey("Tab");
 * await expect.element(button).toHaveFocus();
 * await compareFocusOutline(button); // Or compareFocusOutline() for the same control.
 */
export function captureFocusOutline(target: Locator) {
  const unfocusedOutline = readFocusOutline(target);
  return async function compareFocusOutline(focusedTarget: Locator = target) {
    await assertFocusOutline(focusedTarget, unfocusedOutline);
  };
}

async function assertFocusOutline(
  target: Locator,
  unfocusedOutline: ReturnType<typeof readFocusOutline>,
) {
  await expect
    .poll(() => target.element().matches(":focus-visible"))
    .toBe(true);
  await expect
    .poll(() => readFocusOutline(target))
    .not.toEqual(unfocusedOutline);
  await expect.poll(() => readFocusOutline(target).width).toBeGreaterThan(0);
  await expect
    .poll(() => readFocusOutline(target).style)
    .not.toMatch(/^(none|hidden)$/);
  await expect
    .poll(() => readFocusOutline(target).color)
    .not.toMatch(/^(transparent|rgba\(0, 0, 0, 0\))$/);
}
