import { utils, type Locator } from "vite-plus/test/browser";

/**
 * Returns a locator's current accessibility tree as a string, without asserting.
 * Use when collecting trees in focus order or comparing state before and after an
 * action. For a standalone snapshot assertion, prefer the built-in
 * {@link https://vitest.dev/api/browser/assertions.html#tomatchariainlinesnapshot | toMatchAriaInlineSnapshot}
 * or
 * {@link https://vitest.dev/api/browser/assertions.html#tomatchariasnapshot | toMatchAriaSnapshot}
 * matcher instead.
 *
 * Runs synchronously in the browser and does not wait for the element or its
 * state to settle. Assert readiness first. Captures semantic structure, not native
 * screen-reader speech or visual appearance.
 *
 * @example
 * await expect.element(toolbar).toBeVisible();
 * const sequence: string[] = [];
 * await focusUntil((active) => {
 *   if (!toolbar.element().contains(active.element())) return true;
 *   sequence.push(readAriaSnapshot(active));
 *   return false;
 * });
 * expect(sequence).toMatchInlineSnapshot();
 */
export function readAriaSnapshot(target: Locator): string {
  return utils.aria.renderAriaTree(
    utils.aria.generateAriaTree(target.element()),
  );
}
