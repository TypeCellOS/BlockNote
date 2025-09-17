import { test } from "../../setup/setupScript.js";
import { BASE_URL } from "../../utils/const.js";
import { compareDocToSnapshot, focusOnEditor } from "../../utils/editor.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe("Check Table interactions", () => {
  test("Should be able to type in cell", async ({ page }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "table");
    await page.keyboard.type("Table Cell");

    await compareDocToSnapshot(page, "cellTyping.json");
  });
  test("Tab should cycle cells", async ({ page }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "table");
    // Cycle to sixth (last) cell.
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
    }
    await page.keyboard.type("Table Cell");
    // Cycle back to first cell.
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Shift+Tab");
    }
    await page.keyboard.type("Table Cell");

    await compareDocToSnapshot(page, "tabCells.json");
  });
  test("Arrow keys should move cells", async ({ page }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "table");
    // Move down to second (last) cell in column and third (last) cell in row.
    page.keyboard.press("ArrowDown");
    for (let i = 0; i < 2; i++) {
      await page.keyboard.press("ArrowRight");
    }
    await page.keyboard.type("Table Cell");
    // Cycle back to first cell.
    page.keyboard.press("ArrowUp");
    for (let i = 0; i < 2; i++) {
      await page.keyboard.press("ArrowLeft");
    }
    await page.keyboard.type("Table Cell");

    await compareDocToSnapshot(page, "arrowKeyCells.json");
  });
});
