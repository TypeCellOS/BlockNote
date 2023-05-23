import { test } from "../../setup/setupScript";
import {
  BASE_URL,
  BLOCK_CONTAINER_SELECTOR,
  H_ONE_BLOCK_SELECTOR,
  H_THREE_BLOCK_SELECTOR,
  H_TWO_BLOCK_SELECTOR,
} from "../../utils/const";
import { compareDocToSnapshot, focusOnEditor } from "../../utils/editor";
import { insertHeading, insertParagraph } from "../../utils/copypaste";
import { dragAndDropBlock } from "../../utils/mouse";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
});

test.describe("Check Block Dragging Functionality", () => {
  test("Should be able to drag & drop non-nested blocks", async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === "firefox",
      "Playwright doesn't correctly simulate drag events in Firefox."
    );
    await focusOnEditor(page);

    await insertHeading(page, 1);
    await insertHeading(page, 2);
    await insertHeading(page, 3);

    const dragTarget = await page.locator(H_ONE_BLOCK_SELECTOR);
    const dropTarget = await page.locator(H_TWO_BLOCK_SELECTOR);
    await page.pause();
    await dragAndDropBlock(page, dragTarget, dropTarget, false);

    await page.pause();

    await compareDocToSnapshot(page, "dragdropsingle");
  });

  test("Should be able to drag & drop nested blocks", async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === "firefox",
      "Playwright doesn't correctly simulate drag events in Firefox."
    );
    await focusOnEditor(page);

    await insertHeading(page, 1);
    await insertParagraph(page);

    await page.keyboard.press("Tab");
    await insertHeading(page, 2);
    await page.keyboard.press("Tab");
    await insertParagraph(page);

    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await insertHeading(page, 3);

    // Dragging first heading into next nested element.
    let dragTarget = await page.locator(H_ONE_BLOCK_SELECTOR);
    let dropTarget = await page.locator(H_TWO_BLOCK_SELECTOR);
    await page.pause();
    await dragAndDropBlock(page, dragTarget, dropTarget, true);

    // Dragging second heading into next nested element.
    dragTarget = await page.locator(H_TWO_BLOCK_SELECTOR);
    dropTarget = await page.locator(H_THREE_BLOCK_SELECTOR);
    await page.pause();
    await dragAndDropBlock(page, dragTarget, dropTarget, true);

    // Dragging third heading into outside nesting.
    dragTarget = await page.locator(H_THREE_BLOCK_SELECTOR);
    dropTarget = await page.locator(BLOCK_CONTAINER_SELECTOR).last();
    await page.pause();
    await dragAndDropBlock(page, dragTarget, dropTarget, true);

    await page.pause();

    await compareDocToSnapshot(page, "dragdropnested");
  });
});
