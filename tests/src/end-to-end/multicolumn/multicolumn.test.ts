import { test } from "../../setup/setupScript.js";
import {
  BULLET_LIST_SELECTOR,
  H_ONE_BLOCK_SELECTOR,
  MULTI_COLUMN_URL,
} from "../../utils/const.js";
import { compareDocToSnapshot, focusOnEditor } from "../../utils/editor.js";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await page.goto(MULTI_COLUMN_URL);
});

test.describe("Check Multi-Column Behaviour", () => {
  test("Check Delete before column", async ({ page }) => {
    await focusOnEditor(page);

    await page.click(H_ONE_BLOCK_SELECTOR);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");

    await page.keyboard.press("Delete");

    await compareDocToSnapshot(page, "deleteBeforeColumn.json");
  });
  test("Check Delete before column with single block", async ({ page }) => {
    await focusOnEditor(page);

    await page.locator(".bn-block-column").first().click();

    await page.keyboard.press("Delete");

    await compareDocToSnapshot(page, "deleteBeforeColumnWithSingleBlock.json");
  });
  test("Check Delete before column list", async ({ page }) => {
    await focusOnEditor(page);

    await page.locator(".bn-block-content").first().click();

    await page.keyboard.press("Delete");

    await compareDocToSnapshot(page, "deleteBeforeColumnList.json");
  });
  test("Check Delete end of column list", async ({ page }) => {
    await focusOnEditor(page);

    await page.locator(BULLET_LIST_SELECTOR).last().click();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.type("Paragraph");
    await page.keyboard.press("ControlOrMeta+ArrowLeft");
    await page.keyboard.press("ArrowLeft");

    await page.keyboard.press("Delete");

    await compareDocToSnapshot(page, "deleteEndOfColumnList.json");
  });
});
