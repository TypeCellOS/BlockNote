import { test } from "../../setup/setupScript";
import {
  BASE_URL,
  H_THREE_BLOCK_SELECTOR,
  H_TWO_BLOCK_SELECTOR,
  NEST_BLOCK_BUTTON_SELECTOR,
  UNNEST_BLOCK_BUTTON_SELECTOR,
} from "../../utils/const";
import { insertHeading, insertParagraph } from "../../utils/copypaste";
import { compareDocToSnapshot, focusOnEditor } from "../../utils/editor";

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
});

test.describe("Check Block Indentation Functionality", () => {
  test("Should be able to increase indentation for single block", async ({
    page,
  }) => {
    await focusOnEditor(page);

    await insertParagraph(page);
    await page.keyboard.press("Tab");
    await insertHeading(page, 1);
    await page.keyboard.press("Tab");
    await insertHeading(page, 2);
    await page.keyboard.press("Tab");
    await insertHeading(page, 3);

    const element = await page.locator(H_TWO_BLOCK_SELECTOR);
    const boundingBox = (await element.boundingBox())!;
    const { x, y, height } = boundingBox;

    await page.mouse.click(x + 10, y + height / 2, { clickCount: 2 });

    await page.locator(NEST_BLOCK_BUTTON_SELECTOR).click();

    await page.waitForTimeout(350);
    await page.mouse.click(x + 10, y + height / 2);

    // Waits for formatting toolbar animation to finish.
    await page.waitForTimeout(500);

    await compareDocToSnapshot(page, "increaseIndentSingleBlock");
  });
  test("Should be able to decrease indentation for single block", async ({
    page,
  }) => {
    await focusOnEditor(page);

    await insertParagraph(page);
    await page.keyboard.press("Tab");
    await insertHeading(page, 1);
    await page.keyboard.press("Tab");
    await insertHeading(page, 2);
    await page.keyboard.press("Tab");
    await insertHeading(page, 3);

    const element = await page.locator(H_TWO_BLOCK_SELECTOR);
    const boundingBox = (await element.boundingBox())!;
    const { x, y, height } = boundingBox;

    await page.mouse.click(x + 10, y + height / 2, { clickCount: 2 });

    await page.locator(UNNEST_BLOCK_BUTTON_SELECTOR).click();

    await page.waitForTimeout(350);
    await page.mouse.click(x + 10, y + height / 2);

    // Waits for formatting toolbar animation to finish.
    await page.waitForTimeout(500);

    await compareDocToSnapshot(page, "decreaseIndentSingleBlock");
  });
  test("Should be able to increase indentation for multiple blocks", async ({
    page,
  }) => {
    await focusOnEditor(page);

    await insertParagraph(page);
    await page.keyboard.press("Tab");
    await insertHeading(page, 1);
    await page.keyboard.press("Tab");
    await insertHeading(page, 2);
    await page.keyboard.press("Tab");
    await insertHeading(page, 3);

    const firstElement = await page.locator(H_TWO_BLOCK_SELECTOR);
    const firstElementBoundingBox = (await firstElement.boundingBox())!;
    await page.mouse.click(
      firstElementBoundingBox.x + 20,
      firstElementBoundingBox.y + firstElementBoundingBox.height / 2
    );

    const secondElement = await page.locator(H_THREE_BLOCK_SELECTOR);
    const secondElementBoundingBox = (await secondElement.boundingBox())!;
    await page.keyboard.down("Shift");
    await page.mouse.click(
      secondElementBoundingBox.x + 20,
      secondElementBoundingBox.y + secondElementBoundingBox.height / 2
    );
    await page.keyboard.up("Shift");

    await page.locator(NEST_BLOCK_BUTTON_SELECTOR).click();

    await page.waitForTimeout(350);
    await page.mouse.click(
      secondElementBoundingBox.x + secondElementBoundingBox.width - 20,
      secondElementBoundingBox.y + secondElementBoundingBox.height / 2
    );

    // Waits for formatting toolbar animation to finish.
    await page.waitForTimeout(500);

    await compareDocToSnapshot(page, "increaseIndentMultipleBlocks");
  });
  test("Should be able to decrease indentation for multiple blocks", async ({
    page,
  }) => {
    await focusOnEditor(page);

    await insertParagraph(page);
    await page.keyboard.press("Tab");
    await insertHeading(page, 1);
    await page.keyboard.press("Tab");
    await insertHeading(page, 2);
    await page.keyboard.press("Tab");
    await insertHeading(page, 3);

    const firstElement = await page.locator(H_TWO_BLOCK_SELECTOR);
    const firstElementBoundingBox = (await firstElement.boundingBox())!;
    await page.mouse.click(
      firstElementBoundingBox.x + 20,
      firstElementBoundingBox.y + firstElementBoundingBox.height / 2
    );

    const secondElement = await page.locator(H_THREE_BLOCK_SELECTOR);
    const secondElementBoundingBox = (await secondElement.boundingBox())!;
    await page.keyboard.down("Shift");
    await page.mouse.click(
      secondElementBoundingBox.x + 20,
      secondElementBoundingBox.y + secondElementBoundingBox.height / 2
    );
    await page.keyboard.up("Shift");

    await page.locator(UNNEST_BLOCK_BUTTON_SELECTOR).click();

    await page.waitForTimeout(350);
    await page.mouse.click(
      secondElementBoundingBox.x + secondElementBoundingBox.width - 20,
      secondElementBoundingBox.y + secondElementBoundingBox.height / 2
    );

    // Waits for formatting toolbar animation to finish.
    await page.waitForTimeout(500);

    await compareDocToSnapshot(page, "decreaseIndentMultipleBlocks");
  });
});
