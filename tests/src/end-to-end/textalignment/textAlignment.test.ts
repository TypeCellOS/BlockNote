import { expect } from "@playwright/test";
import { test } from "../../setup/setupScript";
import { ALIGN_TEXT_RIGHT_BUTTON_SELECTOR, BASE_URL } from "../../utils/const";
import { insertHeading } from "../../utils/copypaste";
import { focusOnEditor } from "../../utils/editor";

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
});

test.describe("Check Text Alignment Functionality", () => {
  test("Should be able to set text alignment on single block", async ({
    page,
  }) => {
    await focusOnEditor(page);

    await insertHeading(page, 1);
    await insertHeading(page, 2);
    await insertHeading(page, 3);

    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Control+ArrowLeft");
    await page.keyboard.press("Control+Shift+ArrowRight");

    await page.locator(ALIGN_TEXT_RIGHT_BUTTON_SELECTOR).click();
    await page.waitForTimeout(350);

    await page.keyboard.press("ArrowLeft");

    // Waits for formatting toolbar animation to finish.
    await page.waitForTimeout(500);

    expect(await page.screenshot()).toMatchSnapshot("alignTextSingleBlock.png");
  });
  test("Should be able to set text alignment on multiple blocks", async ({
    page,
  }) => {
    await focusOnEditor(page);

    await insertHeading(page, 1);
    await insertHeading(page, 2);
    await insertHeading(page, 3);

    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Control+ArrowLeft");
    await page.keyboard.press("Control+Shift+ArrowUp");

    await page.locator(ALIGN_TEXT_RIGHT_BUTTON_SELECTOR).click();
    await page.waitForTimeout(350);

    await page.keyboard.press("ArrowLeft");

    // Waits for formatting toolbar animation to finish.
    await page.waitForTimeout(500);

    expect(await page.screenshot()).toMatchSnapshot(
      "alignTextMultipleBlocks.png"
    );
  });
});
