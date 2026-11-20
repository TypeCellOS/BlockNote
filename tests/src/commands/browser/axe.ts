import axe from "axe-core";
import type { Locator } from "vite-plus/test/browser";

/**
 * Runs automated accessibility checks, including target-size, on a ready locator
 * or the entire document body when omitted. Use for rendered component states,
 * including open menus and dialogs; keyboard navigation, accessible state changes,
 * and native speech still need their own tests.
 *
 * Returns the complete axe results without asserting or filtering violations.
 * The top-level test fixture annotates incomplete checks for manual review.
 * Wait for the intended UI to be visible first: this helper does not open it or
 * wait for a locator to exist. Scope the scan to the component under test.
 * Assert known violations precisely rather than marking the whole test `fails`.
 *
 * @example
 * it("checks the open menu", async ({ page, runAxe }) => {
 *   await page.getByRole("button", { name: "Colors" }).click();
 *   const menu = page.getByRole("menu");
 *   await expect.element(menu).toBeVisible();
 *   const { violations } = await runAxe(menu);
 *   expect(violations).toEqual([]);
 * });
 */
export async function runAxe(scope?: Locator): Promise<axe.AxeResults> {
  return axe.run(scope ? scope.element() : document.body, {
    rules: { "target-size": { enabled: true } },
  });
}
