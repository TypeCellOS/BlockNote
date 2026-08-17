import App from "@examples/01-basic/testing/src/App";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { browserName, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR, TABLE_SELECTOR } from "../../utils/const.js";
import {
  compareDocToSnapshot,
  focusOnEditor,
  waitForSelector,
} from "../../utils/editor.js";
import { mouseSequence, moveMouseOverElement } from "../../utils/mouse.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";
import { insertParagraph } from "../../utils/copypaste.js";

// Hovers `cell` to reveal the table handles, then returns the row or
// column handle. The column handle is rendered with a
// `transform: rotate(0.25turn)` on the `.bn-table-handle` element
// itself; the row handle has no transform.
async function getTableHandle(
  cell: HTMLElement,
  orientation: "row" | "column",
): Promise<HTMLElement> {
  await moveMouseOverElement(cell);
  return vi.waitFor(() => {
    const candidate = Array.from(
      document.querySelectorAll<HTMLElement>(".bn-table-handle"),
    ).find((el) => {
      const isColumn = el.style.transform.includes("rotate");
      return orientation === "column" ? isColumn : !isColumn;
    });
    if (!candidate) {
      throw new Error(`${orientation} table handle not visible`);
    }
    return candidate;
  });
}

// Opens the handle's menu and clicks the menu item whose text matches
// `label` (menu items have no test id / aria-label, only text).
async function clickTableHandleMenuItem(
  handle: HTMLElement,
  label: string,
): Promise<void> {
  const box = handle.getBoundingClientRect();
  await mouseSequence([
    { type: "click", x: box.x + box.width / 2, y: box.y + box.height / 2 },
  ]);
  // Re-query across ALL open handle menus on every retry: after clicking a prior
  // menu item a stale `.bn-table-handle-menu` can briefly linger in the DOM
  // (notably on WebKit, which unmounts it a frame later), so capturing a single
  // menu up front and only searching that one can lock onto the wrong (old) menu
  // and never find the item. Scanning every menu each attempt finds it in the
  // fresh one.
  const item = await vi.waitFor(() => {
    const candidate = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".bn-table-handle-menu .mantine-Menu-item",
      ),
    ).find((el) => el.textContent?.trim() === label);
    if (!candidate) {
      throw new Error(`Menu item "${label}" not found`);
    }
    return candidate;
  });
  await userEvent.click(item);
}

function centerOf(element: Element) {
  const box = element.getBoundingClientRect();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

beforeEach(async () => {
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
});

describe("Check Table interactions", () => {
  test("Should be able to type in cell", async () => {
    await focusOnEditor();
    await executeSlashCommand("table");
    await userEvent.keyboard("Table Cell");

    await compareDocToSnapshot("cellTyping");
  });
  test("Tab should cycle cells", async () => {
    await focusOnEditor();
    await executeSlashCommand("table");
    // Cycle to sixth (last) cell.
    for (let i = 0; i < 5; i++) {
      await userEvent.keyboard("{Tab}");
    }
    await userEvent.keyboard("Table Cell");
    // Cycle back to first cell.
    for (let i = 0; i < 5; i++) {
      await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
    }
    await userEvent.keyboard("Table Cell");

    await compareDocToSnapshot("tabCells");
  });
  test("Tab in last cell should be a no-op", async () => {
    await focusOnEditor();

    await insertParagraph();
    await executeSlashCommand("table");

    for (let i = 0; i < 6; i++) {
      await userEvent.keyboard("{Tab}");
    }

    // Only top level block group should exist.
    expect(document.querySelectorAll(".bn-block-group").length).toBe(1);
  });
  test("Shift+Tab in first should be a no-op", async () => {
    await focusOnEditor();

    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await executeSlashCommand("table");

    await userEvent.keyboard("{Shift>}{Tab}{/Shift}");

    // Block group containing table should exist as well as top level group.
    expect(document.querySelectorAll(".bn-block-group").length).toBe(2);
  });
  test("Arrow keys should move cells", async () => {
    await focusOnEditor();
    await executeSlashCommand("table");
    // Move down to second (last) cell in column and third (last) cell in row.
    await userEvent.keyboard("{ArrowDown}");
    for (let i = 0; i < 2; i++) {
      await userEvent.keyboard("{ArrowRight}");
    }
    await userEvent.keyboard("Table Cell");
    // Cycle back to first cell.
    await userEvent.keyboard("{ArrowUp}");
    for (let i = 0; i < 2; i++) {
      await userEvent.keyboard("{ArrowLeft}");
    }
    await userEvent.keyboard("Table Cell");

    await compareDocToSnapshot("arrowKeyCells");
  });
  test("Enter should move to cell below", async () => {
    await focusOnEditor();
    await executeSlashCommand("table");
    await userEvent.keyboard("Top");
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("Bottom");

    await compareDocToSnapshot("enterMovesToCellBelow");
  });
  test("Shift+Enter should create a new line within cell", async () => {
    await focusOnEditor();
    await executeSlashCommand("table");
    await userEvent.keyboard("Line 1");
    await userEvent.keyboard("{Shift>}{Enter}{/Shift}");
    await userEvent.keyboard("Line 2");

    await compareDocToSnapshot("shiftEnterNewLineInCell");
  });
  // Regression test for https://github.com/TypeCellOS/BlockNote/issues/2691.
  // Drops the dragged row to the LEFT of `.bn-block-group` (where the side
  // menu sits). SideMenuView re-dispatches drops outside `.bn-block-group`
  // (within 250px) as synthetic events; without the guard in
  // TableHandles.dropHandler, the synthetic drop AND the original drop both
  // run the row-move logic, dragging an adjacent row along with the target.
  // Playwright doesn't correctly simulate drag events in Firefox.
  test.skipIf(browserName === "firefox")(
    "Row drag should move only the dragged row",
    async () => {
      await focusOnEditor();
      await executeSlashCommand("table");

      // Replace the default table with a deterministic 5-row × 1-col table.
      const cellAttrs = {
        textColor: "default",
        backgroundColor: "default",
        textAlignment: "left",
        colspan: 1,
        rowspan: 1,
        colwidth: null,
      };
      const rowsContent = ["R1", "R2", "R3", "R4", "R5"].map((label) => ({
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
                    content: rowsContent,
                  },
                ],
              },
            ],
          },
        ],
      });
      await vi.waitFor(() => {
        if (document.querySelectorAll(".bn-editor tbody tr").length !== 5) {
          throw new Error("Table not yet replaced");
        }
      });

      // Hover R2's first cell so its row drag handle becomes visible. The
      // row handle has no rotate transform (the column handle does).
      const rows = document.querySelectorAll(`${TABLE_SELECTOR} tbody tr`);
      const r2FirstCell = rows[1].querySelector("td") as HTMLElement;
      await moveMouseOverElement(r2FirstCell);
      const handle = await vi.waitFor(() => {
        const candidate = Array.from(
          document.querySelectorAll(".bn-table-handle"),
        ).find((el) => !el.querySelector(`[style*="rotate"]`));
        if (!candidate) {
          throw new Error("Row drag handle not visible");
        }
        return candidate as HTMLElement;
      });
      const handleBox = handle.getBoundingClientRect();

      // Drop into the side-menu area: LEFT of `.bn-block-group`, vertically
      // aligned with the last row. This is outside the block-group rect but
      // well within the 250px range that triggers SideMenuView's synthetic
      // drop re-dispatch — the same condition that surfaces the bug for
      // real users dragging onto the side gutter.
      const blockGroup = (
        document.querySelector(".bn-block-group") as HTMLElement
      ).getBoundingClientRect();
      const lastRowBox = (
        rows[4].querySelector("td") as HTMLElement
      ).getBoundingClientRect();
      const dropX = blockGroup.x - 50;
      const dropY = lastRowBox.y + lastRowBox.height / 2;

      await mouseSequence([
        {
          type: "move",
          x: handleBox.x + handleBox.width / 2,
          y: handleBox.y + handleBox.height / 2,
          steps: 5,
        },
        { type: "down" },
        { type: "move", x: dropX, y: dropY, steps: 10 },
        { type: "up" },
      ]);

      const order = Array.from(
        document.querySelectorAll(`${TABLE_SELECTOR} tbody tr td:first-child`),
      ).map((t) => (t.textContent ?? "").trim());
      // Expected: only R2 moved. Buggy (#2691): R3 follows along.
      expect(order).toEqual(["R1", "R3", "R4", "R5", "R2"]);
    },
  );
  // Drives the table handle menus to grow the table: first add a
  // column to the right, then add a row below. Playwright doesn't
  // correctly simulate the hover/drag interactions for table handles
  // in Firefox.
  test.skipIf(browserName === "firefox")(
    "Add column then add row via table handle menus",
    async () => {
      await focusOnEditor();
      await executeSlashCommand("table");
      await waitForSelector(TABLE_SELECTOR);

      const firstCell = document.querySelector(
        `${TABLE_SELECTOR} tbody tr td`,
      ) as HTMLElement;

      // Add a column to the right of the first column.
      const columnHandle = await getTableHandle(firstCell, "column");
      await clickTableHandleMenuItem(columnHandle, "Add column right");

      // Add a row below the first row.
      const rowHandle = await getTableHandle(firstCell, "row");
      await clickTableHandleMenuItem(rowHandle, "Add row below");

      await compareDocToSnapshot("addColumnThenRow");
    },
  );

  // Visual feedback shown while a row/column drag is in progress: the cells
  // being dragged are highlighted, and a copy of them is used as the drag
  // image so it follows the cursor. Playwright doesn't correctly simulate
  // drag events in Firefox.
  test.skipIf(browserName === "firefox")(
    "Row drag should highlight the row and use it as the drag image",
    async () => {
      await focusOnEditor();
      await executeSlashCommand("table");
      await waitForSelector(TABLE_SELECTOR);

      const rows = document.querySelectorAll(`${TABLE_SELECTOR} tbody tr`);
      const cellsPerRow = rows[0].querySelectorAll("td").length;
      const handle = await getTableHandle(
        rows[0].querySelector("td") as HTMLElement,
        "row",
      );

      await mouseSequence([
        { type: "move", ...centerOf(handle), steps: 5 },
        { type: "down" },
        // Onto the second row, so the drop cursor has somewhere to go.
        {
          type: "move",
          ...centerOf(rows[1].querySelector("td") as HTMLElement),
          steps: 10,
        },
      ]);

      await vi.waitFor(() => {
        expect(
          document.querySelectorAll(
            `${TABLE_SELECTOR} tbody tr:first-child .bn-table-drag-source`,
          ),
        ).toHaveLength(cellsPerRow);
        expect(
          document.querySelectorAll(".bn-table-drop-cursor").length,
        ).toBeGreaterThan(0);
        // The drag image holds a copy of the dragged row, and shouldn't
        // carry the highlight that's on the row it was copied from.
        expect(
          document.querySelectorAll(".bn-table-drag-preview tr"),
        ).toHaveLength(1);
        expect(
          document.querySelectorAll(
            ".bn-table-drag-preview .bn-table-drag-source",
          ),
        ).toHaveLength(0);
      });

      await mouseSequence([{ type: "up" }]);

      // All of it is transient, and is torn down on `dragend` rather than
      // synchronously with the mouseup.
      await vi.waitFor(() => {
        expect(document.querySelectorAll(".bn-table-drag-source")).toHaveLength(
          0,
        );
        expect(document.querySelectorAll(".bn-table-drop-cursor")).toHaveLength(
          0,
        );
        expect(
          document.querySelectorAll(".bn-table-drag-preview"),
        ).toHaveLength(0);
      });
    },
  );

  test.skipIf(browserName === "firefox")(
    "Column drag should highlight every cell in the column",
    async () => {
      await focusOnEditor();
      await executeSlashCommand("table");
      await waitForSelector(TABLE_SELECTOR);

      const rows = document.querySelectorAll(`${TABLE_SELECTOR} tbody tr`);
      const firstRowCells = rows[0].querySelectorAll("td");
      const handle = await getTableHandle(
        firstRowCells[0] as HTMLElement,
        "column",
      );

      await mouseSequence([
        { type: "move", ...centerOf(handle), steps: 5 },
        { type: "down" },
        {
          type: "move",
          ...centerOf(firstRowCells[firstRowCells.length - 1] as HTMLElement),
          steps: 10,
        },
      ]);

      await vi.waitFor(() => {
        // One highlighted cell per row, and a drag image holding a copy of
        // each of them, stacked one per row.
        expect(document.querySelectorAll(".bn-table-drag-source")).toHaveLength(
          rows.length,
        );
        expect(
          document.querySelectorAll(".bn-table-drag-preview tr"),
        ).toHaveLength(rows.length);
      });

      await mouseSequence([{ type: "up" }]);

      await vi.waitFor(() => {
        expect(document.querySelectorAll(".bn-table-drag-source")).toHaveLength(
          0,
        );
      });
    },
  );

  test.skipIf(browserName === "firefox")(
    "Cancelling a drag should clean up the highlight and drag image",
    async () => {
      await focusOnEditor();
      await executeSlashCommand("table");
      await waitForSelector(TABLE_SELECTOR);

      const rows = document.querySelectorAll(`${TABLE_SELECTOR} tbody tr`);
      const handle = await getTableHandle(
        rows[0].querySelector("td") as HTMLElement,
        "row",
      );

      await mouseSequence([
        { type: "move", ...centerOf(handle), steps: 5 },
        { type: "down" },
        {
          type: "move",
          ...centerOf(rows[1].querySelector("td") as HTMLElement),
          steps: 10,
        },
      ]);
      await vi.waitFor(() => {
        expect(
          document.querySelectorAll(".bn-table-drag-source").length,
        ).toBeGreaterThan(0);
      });

      // Escape cancels a native HTML5 drag: the browser fires `dragend`
      // without a `drop`. Cleanup hangs off the same `dragEnd()` callback
      // either way, so it should run here too.
      await userEvent.keyboard("{Escape}");
      // Release the mouse button so it doesn't leak into the next test.
      await mouseSequence([{ type: "up" }]);

      await vi.waitFor(() => {
        expect(document.querySelectorAll(".bn-table-drag-source")).toHaveLength(
          0,
        );
        expect(
          document.querySelectorAll(".bn-table-drag-preview"),
        ).toHaveLength(0);
      });
    },
  );

  test.skipIf(browserName === "firefox")(
    "Drag image should be the same size as the column being dragged",
    async () => {
      await focusOnEditor();
      await executeSlashCommand("table");
      await waitForSelector(TABLE_SELECTOR);

      const rows = document.querySelectorAll(`${TABLE_SELECTOR} tbody tr`);
      const columnCell = rows[0].querySelector("td") as HTMLElement;
      const columnWidth = columnCell.getBoundingClientRect().width;

      const handle = await getTableHandle(columnCell, "column");
      await mouseSequence([
        { type: "move", ...centerOf(handle), steps: 5 },
        { type: "down" },
        {
          type: "move",
          ...centerOf(rows[0].querySelectorAll("td")[1]),
          steps: 10,
        },
      ]);

      await vi.waitFor(() => {
        const previewCells = document.querySelectorAll(
          ".bn-table-drag-preview td",
        );
        expect(previewCells).toHaveLength(rows.length);
        previewCells.forEach((previewCell) => {
          // Sub-pixel tolerance: the collapsed border around the copy shifts
          // the measured width by about a pixel.
          expect(
            Math.abs(previewCell.getBoundingClientRect().width - columnWidth),
          ).toBeLessThan(2);
        });
      });

      await mouseSequence([{ type: "up" }]);
    },
  );
});
