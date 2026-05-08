import { expect } from "@playwright/test";
import { test } from "../../setup/setupScript.js";
import {
  BASE_URL,
  H_ONE_BLOCK_SELECTOR,
  H_THREE_BLOCK_SELECTOR,
  H_TWO_BLOCK_SELECTOR,
  IMAGE_SELECTOR,
  PARAGRAPH_SELECTOR,
  PDF_FILE_BLOCK_URL,
  PDF_SELECTOR,
} from "../../utils/const.js";
import { insertHeading, insertParagraph } from "../../utils/copypaste.js";
import { compareDocToSnapshot, focusOnEditor } from "../../utils/editor.js";
import { dragAndDropBlock } from "../../utils/mouse.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

test.describe.configure({ mode: "serial" });

test.describe("Check Block Dragging Functionality", () => {
  test("Should be able to drag & drop non-nested blocks", async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === "firefox",
      "Playwright doesn't correctly simulate drag events in Firefox.",
    );
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
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
      "Playwright doesn't correctly simulate drag events in Firefox.",
    );
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
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
    await dragAndDropBlock(page, dragTarget, dropTarget, true);

    // Dragging second heading into next nested element.
    dragTarget = await page.locator(H_TWO_BLOCK_SELECTOR);
    dropTarget = await page.locator(H_THREE_BLOCK_SELECTOR);
    await dragAndDropBlock(page, dragTarget, dropTarget, true);

    // Dragging third heading into outside nesting.
    dragTarget = await page.locator(H_THREE_BLOCK_SELECTOR);
    dropTarget = await page.locator(PARAGRAPH_SELECTOR).last();
    await dragAndDropBlock(page, dragTarget, dropTarget, true);

    await compareDocToSnapshot(page, "dragdropnested");
  });

  test("Should be able to drag image", async ({ page, browserName }) => {
    test.skip(
      browserName === "firefox",
      "Playwright doesn't correctly simulate drag events in Firefox.",
    );
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await focusOnEditor(page);
    await executeSlashCommand(page, "image");

    await insertHeading(page, 1);

    const dragTarget = await page.locator(IMAGE_SELECTOR);
    const dropTarget = await page.locator(H_ONE_BLOCK_SELECTOR);
    await page.pause();
    await dragAndDropBlock(page, dragTarget, dropTarget, false);

    await compareDocToSnapshot(page, "dragImage");
  });

  test("Formatting toolbar should not appear when dragging image block", async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === "firefox",
      "Playwright doesn't correctly simulate drag events in Firefox.",
    );
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await focusOnEditor(page);
    await executeSlashCommand(page, "image");
    await insertHeading(page, 1);

    const dragTarget = page.locator(IMAGE_SELECTOR);
    const dropTarget = page.locator(H_ONE_BLOCK_SELECTOR);
    await dragAndDropBlock(page, dragTarget, dropTarget, false);

    const toolbar = page.locator(".bn-formatting-toolbar");
    await expect(toolbar).not.toBeVisible();
  });

  test("Should be able to drag PDF block", async ({ page, browserName }) => {
    test.skip(
      browserName === "firefox",
      "Playwright doesn't correctly simulate drag events in Firefox.",
    );
    await page.goto(PDF_FILE_BLOCK_URL, { waitUntil: "networkidle" });
    await focusOnEditor(page);
    await page.waitForSelector(PDF_SELECTOR);

    const dragTarget = page.locator(PDF_SELECTOR);
    const dropTarget = page.locator(PARAGRAPH_SELECTOR).first();
    await dragAndDropBlock(page, dragTarget, dropTarget, false);

    await compareDocToSnapshot(page, "dragPdf");
  });
});
