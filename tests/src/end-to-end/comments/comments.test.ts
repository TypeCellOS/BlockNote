import { expect } from "@playwright/test";
import { test } from "../../setup/setupScript.js";
import { COMMENTS_URL, LINK_BUTTON_SELECTOR } from "../../utils/const.js";
import { focusOnEditor } from "../../utils/editor.js";

const EMOJI_BUTTON_SELECTOR = "em-emoji-picker button[aria-posinset]";

test.beforeEach(async ({ page }) => {
  await page.goto(COMMENTS_URL);
});

test.describe("Check Comments functionality", () => {
  test("Should be able to add reactions", async ({ page }) => {
    await focusOnEditor(page);

    await page.keyboard.type("hello");
    await page.locator("text=hello").dblclick();

    await page.click('[data-test="addcomment"]');
    await page.waitForSelector(".bn-thread");

    await page.keyboard.type("test comment");
    await page.click('button[data-test="save"]');

    // Wait for comment composer to close.
    await expect(page.locator(".bn-thread")).toHaveCount(0);

    await page.locator("span.bn-thread-mark").first().click();
    await expect(page.locator(".bn-thread-comment")).toBeVisible();

    // Hover comment to reveal action toolbar.
    await page.locator(".bn-thread-comment").first().hover();
    await expect(page.locator('[data-test="addreaction"]')).toBeVisible();

    // Add a reaction via the action toolbar's add-reaction button.
    await page.click('[data-test="addreaction"]');
    await expect(page.locator(EMOJI_BUTTON_SELECTOR).first()).toBeVisible();
    await page.locator(EMOJI_BUTTON_SELECTOR).first().click();
    await expect(page.locator("em-emoji-picker")).toHaveCount(0);
    await expect(page.locator(".bn-comment-reaction")).toHaveCount(1);

    // Add a second reaction via the add-reaction badge.
    await page.locator(".bn-thread-comment").first().hover();
    await page.click(".bn-comment-add-reaction");
    await expect(page.locator(EMOJI_BUTTON_SELECTOR).first()).toBeVisible();
    
    // Pick a different emoji so it's added as a new reaction rather than
    // toggling the first one off.
    await page.locator(EMOJI_BUTTON_SELECTOR).nth(5).click();
    await expect(page.locator("em-emoji-picker")).toHaveCount(0);
    await expect(page.locator(".bn-comment-reaction")).toHaveCount(2);
  });

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

    await expect(page.locator("span.bn-thread-mark")).toBeVisible();
  });

  test("Should select thread on first click and open link on second click", async ({
    browserName,
    page,
  }) => {
    test.skip(
      browserName === "webkit",
      "WebKit causes absurd failures running in Docker which aren't reproducible anywhere else.",
    );

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

    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(500);
    await expect(page.locator(".bn-thread-mark-selected")).toHaveCount(0);
    await expect(page.locator(".bn-formatting-toolbar")).toBeHidden();

    const link = page.locator('a[data-inline-content-type="link"]').first();

    // First click selects the thread without navigating.
    await link.click();
    await page.waitForTimeout(500);
    await expect(page.locator(".bn-thread-mark-selected")).toBeVisible();

    // Second click on the now-selected thread navigates to the link target.
    const popupPromise = page.waitForEvent("popup");
    await link.click();
    await popupPromise;
  });
});
