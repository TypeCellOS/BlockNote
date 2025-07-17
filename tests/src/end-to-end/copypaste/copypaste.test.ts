/* eslint-disable jest/valid-title */
import { test } from "../../setup/setupScript.js";
import { BASE_URL } from "../../utils/const.js";
import {
  copyPaste,
  copyPasteAll,
  insertHeading,
  insertListItems,
  insertNestedListItems,
  insertParagraph,
  startList,
} from "../../utils/copypaste.js";
import { compareDocToSnapshot, focusOnEditor } from "../../utils/editor.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe("Check Copy/Paste Functionality", () => {
  test("Paragraphs should stay separate", async ({ page, browserName }) => {
    test.skip(
      browserName === "firefox" || browserName === "webkit",
      "Firefox doesn't yet support the async clipboard API. Webkit copy/paste stopped working after updating to Playwright 1.33.",
    );

    await focusOnEditor(page);
    await insertParagraph(page);
    await insertParagraph(page);
    await insertParagraph(page);
    await copyPasteAll(page);

    await compareDocToSnapshot(page, "paragraphs.json");
  });

  test("Headings should keep formatting", async ({ page, browserName }) => {
    test.skip(
      browserName === "firefox" || browserName === "webkit",
      "Firefox doesn't yet support the async clipboard API. Webkit copy/paste stopped working after updating to Playwright 1.33.",
    );

    await focusOnEditor(page);
    await insertHeading(page, 1);
    await insertHeading(page, 2);
    await insertHeading(page, 3);
    await copyPasteAll(page);

    await compareDocToSnapshot(page, "headings.json");
  });

  test("Unordered lists should keep formatting", async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === "firefox" || browserName === "webkit",
      "Firefox doesn't yet support the async clipboard API. Webkit copy/paste stopped working after updating to Playwright 1.33.",
    );

    await focusOnEditor(page);
    await startList(page, false);
    await insertListItems(page);
    await copyPasteAll(page);

    await compareDocToSnapshot(page, "unorderedLists.json");
  });

  test("Ordered lists should keep formatting", async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === "firefox" || browserName === "webkit",
      "Firefox doesn't yet support the async clipboard API. Webkit copy/paste stopped working after updating to Playwright 1.33.",
    );

    await focusOnEditor(page);
    await startList(page, true);
    await insertListItems(page);
    await copyPasteAll(page);

    await compareDocToSnapshot(page, "orderedLists.json");
  });

  test("Nested paragraphs should stay nested", async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === "firefox" || browserName === "webkit",
      "Firefox doesn't yet support the async clipboard API. Webkit copy/paste stopped working after updating to Playwright 1.33.",
    );

    await focusOnEditor(page);
    await insertParagraph(page);
    await page.keyboard.press("Tab");
    await insertParagraph(page);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await insertParagraph(page);
    await copyPasteAll(page);

    await compareDocToSnapshot(page, "nestedParagraphs.json");
  });

  test("Nested unordered lists should stay nested", async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === "firefox" || browserName === "webkit",
      "Firefox doesn't yet support the async clipboard API. Webkit copy/paste stopped working after updating to Playwright 1.33.",
    );

    await focusOnEditor(page);
    await startList(page, false);
    await insertNestedListItems(page);
    await copyPasteAll(page);

    await compareDocToSnapshot(page, "nestedUnorderedLists.json");
  });

  test("Nested ordered lists should stay nested", async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === "firefox" || browserName === "webkit",
      "Firefox doesn't yet support the async clipboard API. Webkit copy/paste stopped working after updating to Playwright 1.33.",
    );

    await focusOnEditor(page);
    await startList(page, true);
    await insertNestedListItems(page);
    await copyPasteAll(page);

    await compareDocToSnapshot(page, "nestedOrderedLists.json");
  });

  test("Images should keep props", async ({ page, browserName }) => {
    test.skip(
      browserName === "firefox" || browserName === "webkit",
      "Firefox doesn't yet support the async clipboard API. Webkit copy/paste stopped working after updating to Playwright 1.33.",
    );

    await focusOnEditor(page);
    await page.keyboard.type("paragraph");

    const IMAGE_EMBED_URL =
      "https://www.pulsecarshalton.co.uk/wp-content/uploads/2016/08/jk-placeholder-image.jpg";
    await executeSlashCommand(page, "image");

    await page.click(`[data-test="embed-tab"]`);
    await page.click(`[data-test="embed-input"]`);
    await page.keyboard.type(IMAGE_EMBED_URL);
    await page.click(`[data-test="embed-input-button"]`);
    await page.waitForSelector(`img[src="${IMAGE_EMBED_URL}"]`);

    await page.click(`img`);

    await page.waitForSelector(`[class*="bn-resize-handle"][style*="right"]`);
    const resizeHandle = page.locator(
      `[class*="bn-resize-handle"][style*="right"]`,
    );
    const resizeHandleBoundingBox = (await resizeHandle.boundingBox())!;
    await page.mouse.move(
      resizeHandleBoundingBox.x + resizeHandleBoundingBox.width / 2,
      resizeHandleBoundingBox.y + resizeHandleBoundingBox.height / 2,
      {
        steps: 5,
      },
    );
    await page.mouse.down();

    await page.mouse.move(
      resizeHandleBoundingBox.x + resizeHandleBoundingBox.width / 2 - 50,
      resizeHandleBoundingBox.y + resizeHandleBoundingBox.height / 2,
      {
        steps: 5,
      },
    );

    await page.mouse.up();

    await copyPaste(page);

    await compareDocToSnapshot(page, "images.json");
  });
});
