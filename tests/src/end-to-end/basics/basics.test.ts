import { expect } from "@playwright/test";
import { test } from "../../setup/setupScript.js";
import { BASE_URL, EDITOR_SELECTOR } from "../../utils/const.js";

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe("Basic typing functionality", () => {
  test("should allow me to type content", async ({ page }) => {
    const editor = await page.waitForSelector(EDITOR_SELECTOR);
    await page
      .locator(EDITOR_SELECTOR + " div")
      .nth(3)
      .click();
    await page.keyboard.insertText("hello world");
    // await page.pause();
    expect(await editor.textContent()).toBe("hello world");
  });
});
