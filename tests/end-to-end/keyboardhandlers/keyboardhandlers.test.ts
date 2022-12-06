import { test } from "../../setup/setupScript";
import {
  BASE_URL,
  H_ONE_BLOCK_SELECTOR,
  H_TWO_BLOCK_SELECTOR,
} from "../../utils/const";
import { compareDocToSnapshot, focusOnEditor } from "../../utils/editor";
import { insertHeading } from "../../utils/copypaste";

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe.configure({ mode: "serial" });
test.describe("Check Keyboard Handlers' Behaviour", () => {
  test("Check Enter when selection is not empty", async ({ page }) => {
    await focusOnEditor(page);
    await insertHeading(page, 1);
    await insertHeading(page, 2);

    const startElement = await page.locator(H_ONE_BLOCK_SELECTOR);
    let boundingBox = await startElement.boundingBox();
    let { x, y, height } = boundingBox;
    await page.mouse.move(x + 35, y + height / 2, { steps: 5 });
    await page.mouse.down();

    const endElement = await page.locator(H_TWO_BLOCK_SELECTOR);
    boundingBox = await endElement.boundingBox();
    ({ x, y, height } = boundingBox);
    await page.mouse.move(x + 105, y + height / 2, { steps: 5 });
    await page.mouse.up();

    await page.keyboard.press("Enter");

    await compareDocToSnapshot(page, "enterSelectionNotEmpty.json");
  });
});
