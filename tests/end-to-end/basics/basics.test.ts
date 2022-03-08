import { test, expect, Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("http://localhost:3000");
  // TODO: add const for that
  // await page.goto("http://host.docker.internal:3000");
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
