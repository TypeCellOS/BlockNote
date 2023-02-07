import { test } from "../../setup/setupScript";
import {
  ALIGN_TEXT_RIGHT_BUTTON_SELECTOR,
  BASE_URL,
  H_ONE_BLOCK_SELECTOR,
  H_TWO_BLOCK_SELECTOR,
} from "../../utils/const";
import { focusOnEditor } from "../../utils/editor";
import { insertHeading } from "../../utils/copypaste";
import { expect } from "@playwright/test";

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

    const element = await page.locator(H_TWO_BLOCK_SELECTOR);
    const boundingBox = await element.boundingBox();
    const { x, y, width, height } = boundingBox;

    await page.mouse.click(x + 20, y + height / 2, { clickCount: 2 });

    await page.locator(ALIGN_TEXT_RIGHT_BUTTON_SELECTOR).click();
    await page.waitForTimeout(350);
    await page.mouse.click(x + width - 20, y + height / 2);

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

    const firstElement = await page.locator(H_TWO_BLOCK_SELECTOR);
    const firstElementBoundingBox = await firstElement.boundingBox();
    await page.mouse.click(
      firstElementBoundingBox.x + 20,
      firstElementBoundingBox.y + firstElementBoundingBox.height / 2
    );

    const secondElement = await page.locator(H_ONE_BLOCK_SELECTOR);
    const secondElementBoundingBox = await secondElement.boundingBox();
    await page.keyboard.down("Shift");
    await page.mouse.click(
      secondElementBoundingBox.x + 20,
      secondElementBoundingBox.y + secondElementBoundingBox.height / 2
    );
    await page.keyboard.up("Shift");

    await page.locator(ALIGN_TEXT_RIGHT_BUTTON_SELECTOR).click();
    await page.waitForTimeout(350);
    await page.mouse.click(
      secondElementBoundingBox.x + secondElementBoundingBox.width - 20,
      secondElementBoundingBox.y + secondElementBoundingBox.height / 2
    );

    // Waits for formatting toolbar animation to finish.
    await page.waitForTimeout(500);

    expect(await page.screenshot()).toMatchSnapshot(
      "alignTextMultipleBlocks.png"
    );
  });
});
