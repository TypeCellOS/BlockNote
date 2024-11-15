import { expect } from "@playwright/test";
import { test } from "../../setup/setupScript.js";
import {
  ARIAKIT_URL,
  DRAG_HANDLE_SELECTOR,
  LINK_BUTTON_SELECTOR,
  PARAGRAPH_SELECTOR,
} from "../../utils/const.js";
import { focusOnEditor } from "../../utils/editor.js";
import { moveMouseOverElement } from "../../utils/mouse.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

test.beforeEach(async ({ page }) => {
  await page.goto(ARIAKIT_URL);
});

test.describe("Check Ariakit UI", () => {
  test("Check formatting toolbar", async ({ page }) => {
    await focusOnEditor(page);
    await page.keyboard.type("Paragraph");
    await page.keyboard.press("Shift+Home");

    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot(
      "ariakit-formatting-toolbar.png"
    );
  });
  test("Check link toolbar", async ({ page }) => {
    await focusOnEditor(page);
    await page.keyboard.type("Paragraph");
    await page.keyboard.press("Shift+Home");

    await page.waitForSelector(LINK_BUTTON_SELECTOR);
    await page.click(LINK_BUTTON_SELECTOR);

    await page.keyboard.type("link");
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowLeft");

    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot("ariakit-link-toolbar.png");
  });
  test("Check slash menu", async ({ page }) => {
    await focusOnEditor(page);
    await page.keyboard.press("/");

    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot("ariakit-slash-menu.png");
  });
  test("Check emoji picker", async ({ page }) => {
    await focusOnEditor(page);
    await page.keyboard.press(":");
    await page.keyboard.type("sm");

    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot("ariakit-emoji-picker.png");
  });
  test("Check side menu", async ({ page }) => {
    await focusOnEditor(page);
    await page.waitForSelector(PARAGRAPH_SELECTOR);
    await moveMouseOverElement(page, page.locator(PARAGRAPH_SELECTOR));

    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot("ariakit-side-menu.png");
  });
  test("Check drag handle menu", async ({ page }) => {
    await focusOnEditor(page);
    await page.waitForSelector(PARAGRAPH_SELECTOR);
    await moveMouseOverElement(page, page.locator(PARAGRAPH_SELECTOR));

    await page.waitForTimeout(500);
    await page.waitForSelector(DRAG_HANDLE_SELECTOR);
    await moveMouseOverElement(page, page.locator(DRAG_HANDLE_SELECTOR));
    await page.mouse.down();
    await page.mouse.up();

    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot(
      "ariakit-drag-handle-menu.png"
    );
  });
  test("Check image toolbar", async ({ page }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "image");

    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot(
      "ariakit-image-toolbar.png"
    );
  });
});
