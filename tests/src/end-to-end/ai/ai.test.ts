import { expect } from "@playwright/test";
import { test } from "../../setup/setupScript.js";
import { AI_URL, EDITOR_SELECTOR } from "../../utils/const.js";

// Use a small viewport so the editor content requires scrolling.
test.use({ viewport: { width: 800, height: 400 } });

test.beforeEach(async ({ page }) => {
  await page.goto(AI_URL);
});

test.describe("AI Menu Scroll Regression", () => {
  test("opening the AI menu should not scroll the page to the top", async ({
    page,
  }) => {
    // Wait for the editor to be ready
    await page.waitForSelector(EDITOR_SELECTOR);

    // Click on the last paragraph so the cursor is near the bottom of the content
    const lastParagraph = page
      .locator("[data-content-type='paragraph']")
      .last();
    await lastParagraph.click();

    // Ensure the page is scrolled down (editor puts cursor near bottom of content)
    // We scroll down explicitly to make sure we're not at the top
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(200);

    // Record the scroll position before opening the AI menu
    const scrollYBefore = await page.evaluate(() => window.scrollY);

    // Sanity check: we should actually be scrolled down
    expect(scrollYBefore).toBeGreaterThan(0);

    // Open the AI menu via the slash command
    // First, focus back on the editor at the last paragraph
    await lastParagraph.click();
    await page.waitForTimeout(100);

    // Type /ai to open the slash menu and select the AI option
    await page.keyboard.type("/ai", { delay: 50 });
    await page.waitForTimeout(300);

    // Wait for the suggestion menu to appear
    const suggestionMenu = page.locator(".bn-suggestion-menu");
    await suggestionMenu.waitFor({ state: "visible", timeout: 3000 });

    // Click the AI suggestion menu item to open the AI menu
    const aiMenuItem = suggestionMenu
      .locator(".bn-suggestion-menu-item")
      .first();
    await aiMenuItem.click();

    // Wait for the AI menu (combobox input) to appear
    const aiMenuInput = page.locator(
      ".bn-combobox-input input, .bn-combobox input",
    );
    await aiMenuInput.waitFor({ state: "visible", timeout: 3000 });

    // Brief wait for any scroll side effects to take place
    await page.waitForTimeout(300);

    // Screenshot after opening AI menu
    expect(await page.screenshot()).toMatchSnapshot(
      "ai_menu_scroll_position.png",
    );

    // Check that the scroll position has not jumped to the top
    const scrollYAfter = await page.evaluate(() => window.scrollY);
    expect(scrollYAfter).toBeGreaterThan(0);
    expect(scrollYAfter).toBeGreaterThanOrEqual(scrollYBefore * 0.2);

    // Verify the AI menu input is actually focused
    await expect(aiMenuInput).toBeFocused();
  });
});
