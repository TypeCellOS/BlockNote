import { expect } from "@playwright/test";
import { test } from "../../setup/setupScript";
import {
  BACKGROUND_COLOR_SELECTOR,
  BASE_URL,
  COLORS_BUTTON_SELECTOR,
  DRAG_HANDLE_MENU_SELECTOR,
  DRAG_HANDLE_SELECTOR,
  H_TWO_BLOCK_SELECTOR,
  TEXT_COLOR_SELECTOR,
} from "../../utils/const";
import { insertHeading, insertParagraph } from "../../utils/copypaste";
import { focusOnEditor } from "../../utils/editor";

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
});

test.describe("Check Background & Text Color Functionality", () => {
  test("Should be able to apply a text color mark", async ({ page }) => {
    await focusOnEditor(page);

    await insertHeading(page, 1);
    await insertHeading(page, 2);
    await insertHeading(page, 3);

    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Control+ArrowLeft");
    await page.keyboard.press("Control+Shift+ArrowRight");

    await page.locator(COLORS_BUTTON_SELECTOR).click();
    await page.locator(TEXT_COLOR_SELECTOR("red")).click();

    await page.keyboard.press("ArrowLeft");

    // Waits for formatting toolbar animation to finish.
    await page.waitForTimeout(500);

    expect(await page.screenshot()).toMatchSnapshot("textColorMark.png");
  });
  test("Should be able to apply a background color mark", async ({ page }) => {
    await focusOnEditor(page);

    await insertHeading(page, 1);
    await insertHeading(page, 2);
    await insertHeading(page, 3);

    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Control+ArrowLeft");
    await page.keyboard.press("Control+Shift+ArrowRight");

    await page.locator(COLORS_BUTTON_SELECTOR).click();
    await page.locator(BACKGROUND_COLOR_SELECTOR("red")).click();

    await page.keyboard.press("ArrowLeft");

    // Waits for formatting toolbar animation to finish.
    await page.waitForTimeout(500);

    expect(await page.screenshot()).toMatchSnapshot("backgroundColorMark.png");
  });
  test("Should be able to set block text color", async ({ page }) => {
    await focusOnEditor(page);

    await insertHeading(page, 1);
    await insertHeading(page, 2);
    await page.keyboard.press("Tab");
    await insertParagraph(page);
    await insertHeading(page, 3);

    await page.hover(H_TWO_BLOCK_SELECTOR);
    await page.click(DRAG_HANDLE_SELECTOR);
    await page.waitForSelector(DRAG_HANDLE_MENU_SELECTOR);
    await page.hover("text=Colors");

    const element = await page.locator(TEXT_COLOR_SELECTOR("red"));
    const boundingBox = (await element.boundingBox())!;
    const { x, y } = boundingBox;
    await page.mouse.click(x + 10, y + 10);

    // Waits for block side menu animation to finish.
    await page.waitForTimeout(500);

    expect(await page.screenshot()).toMatchSnapshot("blockTextColor.png");
  });
  test("Should be able to set block background color", async ({ page }) => {
    await focusOnEditor(page);

    await insertHeading(page, 1);
    await insertHeading(page, 2);
    await page.keyboard.press("Tab");
    await insertParagraph(page);
    await insertHeading(page, 3);

    await page.hover(H_TWO_BLOCK_SELECTOR);
    await page.click(DRAG_HANDLE_SELECTOR);
    await page.waitForSelector(DRAG_HANDLE_MENU_SELECTOR);
    await page.hover("text=Colors");

    const element = await page.locator(BACKGROUND_COLOR_SELECTOR("red"));
    const boundingBox = (await element.boundingBox())!;
    const { x, y } = boundingBox;
    await page.mouse.click(x + 10, y + 10);

    // Waits for block side menu animation to finish.
    await page.waitForTimeout(500);

    expect(await page.screenshot()).toMatchSnapshot("blockBackgroundColor.png");
  });
});
