import { expect } from "@playwright/test";
import { test } from "../../setup/setupScript";
import {
  DRAG_HANDLE_SELECTOR,
  LINK_BUTTON_SELECTOR,
  PARAGRAPH_SELECTOR,
  SHADCN_URL,
} from "../../utils/const";
import { focusOnEditor } from "../../utils/editor";
import { moveMouseOverElement } from "../../utils/mouse";
import { executeSlashCommand } from "../../utils/slashmenu";

test.beforeEach(async ({ page }) => {
  await page.goto(SHADCN_URL);
});

test.describe("Check ShadCN UI", () => {
  test("Check formatting toolbar", async ({ page }) => {
    await focusOnEditor(page);
    await page.keyboard.type("Paragraph");
    await page.keyboard.press("Shift+Home");

    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot(
      "shadcn-formatting-toolbar.png"
    );
  });
  test("Check link toolbar", async ({ page }) => {
    await focusOnEditor(page);
    await page.keyboard.type("Paragraph");
    await page.keyboard.press("Shift+Home");

    await page.waitForSelector(LINK_BUTTON_SELECTOR);
    await page.click(LINK_BUTTON_SELECTOR, { position: { x: 5, y: 5 } });

    await page.keyboard.type("link");
    await page.keyboard.press("Enter");

    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot("shadcn-link-toolbar.png");
  });
  test("Check slash menu", async ({ page }) => {
    await focusOnEditor(page);
    await page.keyboard.press("/");

    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot("shadcn-slash-menu.png");
  });
  test("Check emoji picker", async ({ page }) => {
    await focusOnEditor(page);
    await page.keyboard.press(":");
    await page.keyboard.type("sm");

    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot("shadcn-emoji-picker.png");
  });
  test("Check side menu", async ({ page }) => {
    await focusOnEditor(page);
    await page.waitForSelector(PARAGRAPH_SELECTOR);
    await moveMouseOverElement(page, page.locator(PARAGRAPH_SELECTOR));

    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot("shadcn-side-menu.png");
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
      "shadcn-drag-handle-menu.png"
    );
  });
  test("Check image toolbar", async ({ page }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "image");

    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot("shadcn-image-toolbar.png");
  });
});
