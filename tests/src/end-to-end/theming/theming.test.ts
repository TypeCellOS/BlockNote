import { expect } from "@playwright/test";
import { test } from "../../setup/setupScript";
import {
  BASE_URL,
  DRAG_HANDLE_SELECTOR,
  LINK_BUTTON_SELECTOR,
  PARAGRAPH_SELECTOR,
} from "../../utils/const";
import { focusOnEditor } from "../../utils/editor";
import { moveMouseOverElement } from "../../utils/mouse";
import { executeSlashCommand } from "../../utils/slashmenu";

test.use({
  colorScheme: "dark",
});

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe("Check Dark Theme is Automatically Applied", () => {
  test("Should show dark editor", async ({ page }) => {
    await focusOnEditor(page);
    await page.keyboard.type("Paragraph");

    expect(await page.screenshot()).toMatchSnapshot("dark-editor.png");
  });
  test("Should show dark formatting toolbar", async ({ page }) => {
    await focusOnEditor(page);
    await page.keyboard.type("Paragraph");
    await page.keyboard.press("Shift+Home");

    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot(
      "dark-formatting-toolbar.png"
    );
  });
  test("Should show dark hyperlink toolbar", async ({ page }) => {
    await focusOnEditor(page);
    await page.keyboard.type("Paragraph");
    await page.keyboard.press("Shift+Home");

    await page.waitForSelector(LINK_BUTTON_SELECTOR);
    await page.click(LINK_BUTTON_SELECTOR);

    await page.keyboard.type("link");
    await page.keyboard.press("Enter");

    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot(
      "dark-hyperlink-toolbar.png"
    );
  });
  test("Should show dark slash menu", async ({ page }) => {
    await focusOnEditor(page);
    await page.keyboard.press("/");

    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot("dark-slash-menu.png");
  });
  test("Should show dark side menu", async ({ page }) => {
    await focusOnEditor(page);
    await page.waitForSelector(PARAGRAPH_SELECTOR);
    await moveMouseOverElement(page, page.locator(PARAGRAPH_SELECTOR));

    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot("dark-side-menu.png");
  });
  test("Should show drag handle menu", async ({ page }) => {
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
      "dark-drag-handle-menu.png"
    );
  });
  test("Should show dark image toolbar", async ({ page }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "image");

    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot("dark-image-toolbar.png");
  });
});
