import { expect } from "@playwright/test";
import { test } from "../../setup/setupScript.js";
import { BASIC_BLOCKS_URL, PARAGRAPH_SELECTOR } from "../../utils/const.js";
import { focusOnEditor } from "../../utils/editor.js";

test.beforeEach(async ({ page }) => {
  await page.goto(BASIC_BLOCKS_URL);
});

test.describe("Check basic text block appearance", () => {
  test("Check basic text block appearance", async ({ page }) => {
    focusOnEditor(page);
    await page.waitForTimeout(100);
    await page
      .locator(`${PARAGRAPH_SELECTOR} > p`, {
        hasText: "Welcome to this demo!",
      })
      .click();

    // Scroll to top of page.
    await page.mouse.wheel(0, -9999);

    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot("basic-blocks-top.png");

    // Scroll to bottom of page.
    await page.mouse.wheel(0, 9999);
    // We have to scroll twice because Firefox gets stuck otherwise?
    await page.mouse.wheel(0, 9999);

    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot("basic-blocks-bottom.png");
  });
});
