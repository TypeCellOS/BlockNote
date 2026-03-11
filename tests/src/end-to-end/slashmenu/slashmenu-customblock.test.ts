import { expect } from "@playwright/test";
import { test } from "../../setup/setupScript.js";
import { SLASH_MENU_SELECTOR } from "../../utils/const.js";

const PORT = 3000;
const ALERT_BLOCK_URL = !process.env.RUN_IN_DOCKER
  ? `http://localhost:${PORT}/custom-schema/alert-block?hideMenu`
  : `http://host.docker.internal:${PORT}/custom-schema/alert-block?hideMenu`;

// Regression test for https://github.com/TypeCellOS/BlockNote/issues/2531
// The slash menu should open when "/" is typed after a space inside a custom
// block (isolating: true, separate contentDOM). Previously the menu failed to
// open in this scenario.
test.describe("Slash menu in custom (alert) block – issue #2531", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ALERT_BLOCK_URL);
    await page.waitForSelector(".bn-editor");
  });

  test("opens slash menu when / is typed at end of alert block content (no preceding space)", async ({
    page,
  }) => {
    // Click into the editable content area of the alert block
    const alertContent = page
      .locator('[data-content-type="alert"]')
      .first()
      .locator(".bn-inline-content");
    await alertContent.click();
    await page.keyboard.press("End");

    await page.keyboard.type("/");
    await expect(page.locator(SLASH_MENU_SELECTOR)).toBeVisible();
  });

  test("opens slash menu when / is typed after a space inside alert block (the regression)", async ({
    page,
  }) => {
    // Click into the editable content area of the alert block
    const alertContent = page
      .locator('[data-content-type="alert"]')
      .first()
      .locator(".bn-inline-content");
    await alertContent.click();
    await page.keyboard.press("End");

    // Type a space first — this is the scenario that broke the menu
    await page.keyboard.type(" ");
    await page.keyboard.type("/");
    await expect(page.locator(SLASH_MENU_SELECTOR)).toBeVisible();
  });
});
