import { expect } from "@playwright/test";
import { test } from "../../setup/setupScript.js";
import { BASE_URL, LINK_BUTTON_SELECTOR } from "../../utils/const.js";
import { focusOnEditor } from "../../utils/editor.js";

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe("Check Link Toolbar functionality", () => {
  test("Should preserve existing marks when editing a link", async ({
    page,
  }) => {
    await focusOnEditor(page);

    // Type bold text
    await page.keyboard.type("hello");
    await page.keyboard.press("Shift+Home");

    // Make it bold via formatting toolbar
    await page.waitForSelector(`[data-test="bold"]`);
    await page.click(`[data-test="bold"]`);

    // Add link
    await page.keyboard.press("Shift+Home");
    await page.waitForSelector(LINK_BUTTON_SELECTOR);
    await page.click(LINK_BUTTON_SELECTOR);
    await page.keyboard.type("https://example.com");
    await page.keyboard.press("Enter");

    // Move cursor back onto the linked text to trigger link toolbar
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(500);

    // Click Edit link button
    const editButton = page.getByText("Edit link");
    await editButton.waitFor({ state: "visible" });
    await editButton.click();

    await page.keyboard.press("Control+A");
    await page.keyboard.type("https://example2.com");
    await page.keyboard.press("Enter");

    await page.waitForTimeout(300);

    // Verify bold mark is still present on the text
    const boldText = page.locator("strong a, a strong");
    await expect(boldText).toBeVisible();
  });
});