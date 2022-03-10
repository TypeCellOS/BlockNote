import { test, expect, Page } from "@playwright/test";
import { BASE_URL } from "../../utils/const";

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe("Basic typing functionality", () => {
  test("should allow me to type content", async ({ page }) => {
    const editor = await page.waitForSelector("[data-test='editor']");
    await page.locator('[data-test="editor"] div').nth(3).click();
    await page.keyboard.insertText("hello world");
    // await page.pause();
    expect(await editor.textContent()).toBe("hello world");
  });
});
