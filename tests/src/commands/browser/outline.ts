import { expect } from "vite-plus/test";
import type { Locator } from "vite-plus/test/browser";

export type FocusOutline = { width: number; style: string; color: string };

/**
 * Reads an element's computed CSS outline without changing focus or asserting.
 * Use before keyboard navigation to capture the baseline for {@link assertFocusOutline};
 * use explicit style assertions instead when testing a particular outline value.
 * This is synchronous and does not wait for the locator to exist.
 *
 * @example
 * await expect.element(button).toBeVisible();
 * const baseline = readFocusOutline(button);
 * await pressKey("Tab");
 * await assertFocusOutline(button, baseline);
 */
export function readFocusOutline(target: Locator): FocusOutline {
  const style = getComputedStyle(target.element());
  return {
    width: Number.parseFloat(style.outlineWidth),
    style: style.outlineStyle,
    color: style.outlineColor,
  };
}

/**
 * Asserts `:focus-visible` and a nonzero, non-hidden, nontransparent CSS outline,
 * retrying until those conditions hold. With a baseline, also asserts the outline
 * changed. Use for a control's keyboard focus indicator after real keyboard input;
 * assert focus alone when testing its destination rather than styling.
 *
 * Does not move focus, measure contrast, check occlusion, or recognize indicators
 * implemented only with a border or box-shadow. Omit the baseline when testing
 * an input that was autofocused by keyboard activation of a popup.
 *
 * @example
 * const baseline = readFocusOutline(button);
 * await pressKey("Tab");
 * await expect.element(button).toHaveFocus();
 * await assertFocusOutline(button, baseline);
 *
 * @example
 * await pressKey("Enter");
 * await expect.element(urlInput).toHaveFocus();
 * await assertFocusOutline(urlInput);
 */
export async function assertFocusOutline(
  target: Locator,
  unfocusedOutline?: FocusOutline,
): Promise<void> {
  await expect
    .poll(() => target.element().matches(":focus-visible"))
    .toBe(true);
  if (unfocusedOutline) {
    await expect
      .poll(() => readFocusOutline(target))
      .not.toEqual(unfocusedOutline);
  }
  await expect.poll(() => readFocusOutline(target).width).toBeGreaterThan(0);
  await expect
    .poll(() => readFocusOutline(target).style)
    .not.toMatch(/^(none|hidden)$/);
  await expect
    .poll(() => readFocusOutline(target).color)
    .not.toMatch(/^(transparent|rgba\(0, 0, 0, 0\))$/);
}
