import { expect } from "@playwright/test";
import { test } from "../../setup/setupScript.js";
import { STATIC_URL } from "../../utils/const.js";

test.beforeEach(async ({ page }) => {
  await page.goto(STATIC_URL);
});

test.describe("Check static rendering", () => {
  test("Check screenshot", async ({ page }) => {
    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot("static-rendering.png");
  });
});
