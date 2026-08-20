import { expect } from "vite-plus/test";

/**
 * Browser-mode `expect` helpers for the y-prosemirror suggestion suite.
 *
 * The vite-plus `expect` exposes the browser matchers (`.element(locator)` with
 * its auto-retry visibility wait, and `.toMatchScreenshot`) at runtime, but its
 * published TypeScript types don't surface them (same reason `utils/editor.ts`
 * casts `expect` for its `expectElement` helper). These thin wrappers centralise
 * the cast so the test bodies stay clean and fully typed.
 */

/** Any object that can be screenshot-tested (vitest-browser locator, etc). */
type LocatorLike = unknown;

interface ElementAssertion {
  toBeVisible(): Promise<void>;
}

interface BrowserExpect {
  element(locator: unknown): ElementAssertion;
}

const browserExpect = expect as unknown as BrowserExpect;

/**
 * Assert a locator resolves to a visible element, retrying until it does. Use as
 * the wait between an async editor edit and a snapshot/screenshot.
 */
export function expectVisible(locator: unknown): Promise<void> {
  return browserExpect.element(locator).toBeVisible();
}

/** Capture a visual regression screenshot of the element a locator resolves to. */
export function expectScreenshot(
  locator: LocatorLike,
  name?: string,
): Promise<void> {
  return (expect(locator) as any).toMatchScreenshot(name);
}
