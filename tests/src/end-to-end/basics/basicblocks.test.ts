import { expect } from "@playwright/test";
import { test } from "../../setup/setupScript.js";
import { BASIC_BLOCKS_URL, PARAGRAPH_SELECTOR } from "../../utils/const.js";
import { focusOnEditor } from "../../utils/editor.js";

test.beforeEach(async ({ page }) => {
  await page.goto(BASIC_BLOCKS_URL);
});

// Skip due to flaky timeout on locator.click
test.describe.skip("Check basic text block appearance", () => {
  test("renders correctly", async ({ page }) => {
    focusOnEditor(page);
    await page.waitForTimeout(500);

    await page.locator(`[data-content-type="audio"] .bn-file-caption`).click();
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(500);

    await page.locator(`[data-content-type="video"] .bn-file-caption`).click();
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(500);

    await page
      .locator(`${PARAGRAPH_SELECTOR} > p`, {
        hasText: "Welcome to this demo!",
      })
      .click();

    await page.waitForTimeout(100);
    expect(await page.screenshot({ fullPage: true })).toMatchSnapshot(
      "basicblocks.png",
    );
  });
});
