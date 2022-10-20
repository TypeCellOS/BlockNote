import { test } from "@playwright/test";
import { BASE_URL, TYPE_DELAY } from "../../utils/const";
import { compareDocToSnapshot, focusOnEditor } from "../../utils/editor";
import {
  copyPasteAll,
  insertHeading,
  startList,
  insertListItems,
  insertNestedListItems,
  insertParagraph,
} from "../../utils/copypaste";

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe("Check Copy/Paste Functionality", () => {
  test("Paragraphs should stay separate", async ({ page, browser }) => {
    await focusOnEditor(page);
    await insertParagraph(page);
    await insertParagraph(page);
    await insertParagraph(page);
    await copyPasteAll(page, browser.browserType().name());

    await compareDocToSnapshot(page, "paragraphs.json");
  });

  test("Headings should keep formatting", async ({ page, browser }) => {
    await focusOnEditor(page);
    await insertHeading(page, 1);
    await insertHeading(page, 2);
    await insertHeading(page, 3);
    await copyPasteAll(page, browser.browserType().name());

    await compareDocToSnapshot(page, "headings.json");
  });

  test("Unordered lists should keep formatting", async ({ page, browser }) => {
    await focusOnEditor(page);
    await startList(page, false);
    await insertListItems(page);
    await copyPasteAll(page, browser.browserType().name());

    await compareDocToSnapshot(page, "unorderedLists.json");
  });

  test("Ordered lists should keep formatting", async ({ page, browser }) => {
    await focusOnEditor(page);
    await startList(page, true);
    await insertListItems(page);
    await copyPasteAll(page, browser.browserType().name());

    await compareDocToSnapshot(page, "orderedLists.json");
  });

  test("Nested paragraphs should stay nested", async ({ page, browser }) => {
    await focusOnEditor(page);
    await insertParagraph(page);
    await page.keyboard.press("Tab", { delay: TYPE_DELAY });
    await insertParagraph(page);
    await page.keyboard.press("Tab", { delay: TYPE_DELAY });
    await page.keyboard.press("Tab", { delay: TYPE_DELAY });
    await insertParagraph(page);
    await copyPasteAll(page, browser.browserType().name());

    await compareDocToSnapshot(page, "nestedParagraphs.json");
  });

  test("Nested unordered lists should stay nested", async ({
    page,
    browser,
  }) => {
    await focusOnEditor(page);
    await startList(page, false);
    await insertNestedListItems(page);
    await copyPasteAll(page, browser.browserType().name());

    await compareDocToSnapshot(page, "nestedUnorderedLists.json");
  });

  test("Nested ordered lists should stay nested", async ({ page, browser }) => {
    await focusOnEditor(page);
    await startList(page, true);
    await insertNestedListItems(page);
    await copyPasteAll(page, browser.browserType().name());

    await compareDocToSnapshot(page, "nestedOrderedLists.json");
  });
});
