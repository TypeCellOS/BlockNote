import { expect } from "@playwright/test";
import { test } from "../../setup/setupScript.js";
import { BASE_URL, TABLE_SELECTOR } from "../../utils/const.js";
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
  test("Enter should move to cell below", async ({ page }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "table");
    await page.keyboard.type("Top");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Bottom");

    await compareDocToSnapshot(page, "enterMovesToCellBelow.json");
  });
  test("Shift+Enter should create a new line within cell", async ({ page }) => {
    await focusOnEditor(page);
    await executeSlashCommand(page, "table");
    await page.keyboard.type("Line 1");
    await page.keyboard.press("Shift+Enter");
    await page.keyboard.type("Line 2");

    await compareDocToSnapshot(page, "shiftEnterNewLineInCell.json");
  });
  // Regression test for https://github.com/TypeCellOS/BlockNote/issues/2691.
  // Drops the dragged row to the LEFT of `.bn-block-group` (where the side
  // menu sits). SideMenuView re-dispatches drops outside `.bn-block-group`
  // (within 250px) as synthetic events; without the guard in
  // TableHandles.dropHandler, the synthetic drop AND the original drop both
  // run the row-move logic, dragging an adjacent row along with the target.
  test("Row drag should move only the dragged row", async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === "firefox",
      "Playwright doesn't correctly simulate drag events in Firefox.",
    );

    await focusOnEditor(page);
    await executeSlashCommand(page, "table");

    // Replace the default table with a deterministic 5-row × 1-col table.
    await page.evaluate(() => {
      const cellAttrs = {
        textColor: "default",
        backgroundColor: "default",
        textAlignment: "left",
        colspan: 1,
        rowspan: 1,
        colwidth: null,
      };
      const rows = ["R1", "R2", "R3", "R4", "R5"].map((label) => ({
        type: "tableRow",
        content: [
          {
            type: "tableCell",
            attrs: cellAttrs,
            content: [
              {
                type: "tableParagraph",
                content: [{ type: "text", text: label }],
              },
            ],
          },
        ],
      }));
      (
        window as unknown as {
          ProseMirror: {
            commands: { setContent: (doc: unknown) => void };
          };
        }
      ).ProseMirror.commands.setContent({
        type: "doc",
        content: [
          {
            type: "blockGroup",
            content: [
              {
                type: "blockContainer",
                attrs: { id: "0" },
                content: [
                  {
                    type: "table",
                    attrs: { textColor: "default" },
                    content: rows,
                  },
                ],
              },
            ],
          },
        ],
      });
    });
    await page.waitForFunction(
      () => document.querySelectorAll(".bn-editor tbody tr").length === 5,
    );

    // Hover R2's first cell so its row drag handle becomes visible. The
    // row handle has no rotate transform (the column handle does).
    const rows = page.locator(`${TABLE_SELECTOR} tbody tr`);
    await rows.nth(1).locator("td").first().hover();
    const handle = page
      .locator(".bn-table-handle")
      .filter({ hasNot: page.locator(`[style*="rotate"]`) })
      .first();
    await handle.waitFor({ state: "visible" });
    const handleBox = (await handle.boundingBox())!;

    // Drop into the side-menu area: LEFT of `.bn-block-group`, vertically
    // aligned with the last row. This is outside the block-group rect but
    // well within the 250px range that triggers SideMenuView's synthetic
    // drop re-dispatch — the same condition that surfaces the bug for
    // real users dragging onto the side gutter.
    const blockGroup = (await page
      .locator(".bn-block-group")
      .first()
      .boundingBox())!;
    const lastRowBox = (await rows.nth(4).locator("td").first().boundingBox())!;
    const dropX = blockGroup.x - 50;
    const dropY = lastRowBox.y + lastRowBox.height / 2;

    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2,
      { steps: 5 },
    );
    await page.mouse.down();
    await page.mouse.move(dropX, dropY, { steps: 10 });
    await page.mouse.up();

    const order = (
      await page
        .locator(`${TABLE_SELECTOR} tbody tr td:first-child`)
        .allInnerTexts()
    ).map((t) => t.trim());
    // Expected: only R2 moved. Buggy (#2691): R3 follows along.
    expect(order).toEqual(["R1", "R3", "R4", "R5", "R2"]);
  });
});
