import { test } from "../../setup/setupScript";
import { BASE_URL } from "../../utils/const";
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

test.describe.configure({ mode: "serial" });
test.describe("Check Copy/Paste Functionality", () => {
  test("Paragraphs should stay separate", async ({ page, browserName }) => {
    test.skip(
      browserName === "firefox",
      "Firefox doesn't yet support the async clipboard API."
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
      browserName === "firefox",
      "Firefox doesn't yet support the async clipboard API."
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
      browserName === "firefox",
      "Firefox doesn't yet support the async clipboard API."
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
      browserName === "firefox",
      "Firefox doesn't yet support the async clipboard API."
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
      browserName === "firefox",
      "Firefox doesn't yet support the async clipboard API."
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
      browserName === "firefox",
      "Firefox doesn't yet support the async clipboard API."
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
      browserName === "firefox",
      "Firefox doesn't yet support the async clipboard API."
    );

    await focusOnEditor(page);
    await startList(page, true);
    await insertNestedListItems(page);
    await copyPasteAll(page);

    await compareDocToSnapshot(page, "nestedOrderedLists.json");
  });
});
