import { expect } from "@playwright/test";
import { test } from "../../setup/setupScript.js";
import { BASE_URL, EDITOR_SELECTOR } from "../../utils/const.js";

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe("Basic placeholder functionality", () => {
  test("should show placeholder on load", async ({ page }) => {
    // const editor = await page.waitForSelector("[data-test='editor']");
    await page
      .locator(EDITOR_SELECTOR + " div")
      .nth(3)
      .hover();

    // TODO: doesn't work. No way to access text of ::before element?
    // expect(await editor.textContent()).toBe(
    //   "Enter text or type '/' for commands"
    // );
    await new Promise((r) => setTimeout(r, 1000));
    expect(await page.screenshot()).toMatchSnapshot("initial-placeholder.png");
  });
});
