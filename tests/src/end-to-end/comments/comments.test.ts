import { expect } from "@playwright/test";
import { test } from "../../setup/setupScript.js";
import { COMMENTS_URL, LINK_BUTTON_SELECTOR } from "../../utils/const.js";
import { focusOnEditor } from "../../utils/editor.js";

test.beforeEach(async ({ page }) => {
  await page.goto(COMMENTS_URL);
});

test.describe("Check Comments functionality", () => {
  test("Should preserve existing comments when adding a link", async ({
    page,
  }) => {
    await focusOnEditor(page);

    // Type text and select it
    await page.keyboard.type("hello");
    await page.keyboard.press("Shift+Home");

    await page.click('[data-test="addcomment"]');
    await page.waitForSelector(".bn-thread");

    await page.keyboard.type("test comment");
    await page.click('button[data-test="save"]');

    // Wait for the comment mark to appear on the text
    await page.click("span.bn-thread-mark", { position: { x: 1, y: 1 } });

    // Re-select the commented text by clicking at the start and shift-clicking
    // at the end, staying within the editor
    await page.keyboard.press("Shift+End");

    // Add a link via the formatting toolbar
    await page.waitForSelector(LINK_BUTTON_SELECTOR);
    await page.click(LINK_BUTTON_SELECTOR);
    await page.waitForSelector("input");

    await page.keyboard.type("https://example.com");
    await page.keyboard.press("Enter");

    await expect(await page.locator("span.bn-thread-mark")).toBeVisible();
  });
});
