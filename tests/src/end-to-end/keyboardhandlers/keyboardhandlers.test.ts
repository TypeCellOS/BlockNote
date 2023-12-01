import { test } from "../../setup/setupScript";
import {
  BASE_URL,
  H_ONE_BLOCK_SELECTOR,
  H_TWO_BLOCK_SELECTOR,
  ITALIC_BUTTON_SELECTOR,
} from "../../utils/const";
import { insertHeading, insertParagraph } from "../../utils/copypaste";
import { compareDocToSnapshot, focusOnEditor } from "../../utils/editor";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe("Check Keyboard Handlers' Behaviour", () => {
  test("Check Enter when selection is not empty", async ({ page }) => {
    await focusOnEditor(page);
    await insertHeading(page, 1);
    await insertHeading(page, 2);

    await page.waitForTimeout(500);
    const startElement = await page.locator(H_ONE_BLOCK_SELECTOR);
    let boundingBox = (await startElement.boundingBox())!;
    let { x, y, height } = boundingBox;
    await page.mouse.move(x + 35, y + height / 2, { steps: 5 });
    await page.mouse.down();

    const endElement = await page.locator(H_TWO_BLOCK_SELECTOR);
    boundingBox = (await endElement.boundingBox())!;
    ({ x, y, height } = boundingBox);
    await page.mouse.move(x + 105, y + height / 2, { steps: 5 });
    await page.mouse.up();

    await page.keyboard.press("Enter");

    await compareDocToSnapshot(page, "enterSelectionNotEmpty.json");
  });
  test("Check Enter preserves marks", async ({ page }) => {
    await focusOnEditor(page);
    await insertHeading(page, 1);

    await page.waitForTimeout(500);
    const element = await page.locator(H_ONE_BLOCK_SELECTOR);
    const boundingBox = (await element.boundingBox())!;
    const { x, y, height } = boundingBox;

    await page.mouse.click(x + 35, y + height / 2, { clickCount: 2 });
    await page.locator(ITALIC_BUTTON_SELECTOR).click();
    await page.waitForTimeout(500);
    await page.mouse.click(x + 35, y + height / 2);
    await page.keyboard.press("Enter");

    await compareDocToSnapshot(page, "enterPreservesMarks.json");
  });
  test("Check Enter preserves nested blocks", async ({ page }) => {
    await focusOnEditor(page);
    await insertHeading(page, 1);
    await page.keyboard.press("Tab");
    await insertHeading(page, 2);
    await page.keyboard.press("Tab");
    await insertHeading(page, 3);

    await page.waitForTimeout(500);
    const element = await page.locator(H_ONE_BLOCK_SELECTOR);
    const boundingBox = (await element.boundingBox())!;
    const { x, y, height } = boundingBox;

    await page.mouse.click(x + 35, y + height / 2);
    await page.keyboard.press("Enter");

    await compareDocToSnapshot(page, "enterPreservesNestedBlocks.json");
  });
  test("Check Backspace at the start of a block", async ({ page }) => {
    await focusOnEditor(page);
    await insertHeading(page, 1);

    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Control+ArrowLeft");
    await page.keyboard.press("Backspace");

    await compareDocToSnapshot(page, "backspaceStartOfBlock.json");
  });
  test("Check Backspace preserves marks", async ({ page }) => {
    await focusOnEditor(page);
    await insertParagraph(page);
    await insertParagraph(page);

    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Control+ArrowLeft");

    for (let i = 0; i < 2; i++) {
      await page.keyboard.press("ArrowRight");
    }

    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Shift+ArrowRight");
    }

    await page.locator(ITALIC_BUTTON_SELECTOR).click();
    await page.waitForTimeout(500);

    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Control+ArrowLeft");
    await page.keyboard.press("Backspace");

    await compareDocToSnapshot(page, "backspacePreservesMarks.json");
  });
  test("Check Backspace preserves nested blocks", async ({ page }) => {
    await focusOnEditor(page);
    await insertParagraph(page);
    await insertParagraph(page);
    await page.keyboard.press("Tab");
    await insertParagraph(page);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await insertParagraph(page);

    for (let i = 0; i < 3; i++) {
      await page.keyboard.press("ArrowUp");
    }

    await page.keyboard.press("Control+ArrowLeft");
    await page.keyboard.press("Backspace");

    await compareDocToSnapshot(page, "backspacePreservesNestedBlocks.json");
  });
});
