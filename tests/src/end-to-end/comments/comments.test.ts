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

    await page.keyboard.type("hello");
    await page.locator("text=hello").dblclick();

    await page.click('[data-test="addcomment"]');
    await page.waitForSelector(".bn-thread");

    await page.keyboard.type("test comment");
    await page.click('button[data-test="save"]');

    await page.locator("span.bn-thread-mark").first().dblclick();

    await expect(page.locator(LINK_BUTTON_SELECTOR)).toBeVisible();
    await page.click(LINK_BUTTON_SELECTOR);

    await page.keyboard.type("https://example.com");
    await page.keyboard.press("Enter");

    await expect(await page.locator("span.bn-thread-mark")).toBeVisible();
  });
});
