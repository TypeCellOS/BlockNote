import App from "@examples/01-basic/testing/src/App";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";
import type { EditorView } from "prosemirror-view";
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

  // Regression test for https://github.com/TypeCellOS/BlockNote/issues/2921.
  // `TableHandlesView.tablePos` is only refreshed on `mousemove`, which does
  // not fire while a native drag is in progress. A transaction that changes
  // the document elsewhere mid-drag - a concurrent local edit, or another
  // collaborator's change over Yjs - therefore used to leave it stale, and the
  // next `dragover` resolved it into the wrong node and threw a RangeError out
  // of `decorations()`. That breaks `dispatchTransaction` for the *other*
  // edit, not just the drag. Playwright doesn't correctly simulate drag events
  // in Firefox.
  test.skipIf(browserName === "firefox")(
    "Document change mid-drag should not break the drag",
    async () => {
      await focusOnEditor();
      await userEvent.keyboard("Paragraph above the table");
      await userEvent.keyboard("{Enter}");
      await executeSlashCommand("table");
      await waitForSelector(TABLE_SELECTOR);

      const rows = document.querySelectorAll(`${TABLE_SELECTOR} tbody tr`);
      const handle = await getTableHandle(
        rows[0].querySelector("td") as HTMLElement,
        "row",
      );
      const handleBox = handle.getBoundingClientRect();
      const secondRowBox = (
        rows[1].querySelector("td") as HTMLElement
      ).getBoundingClientRect();

      await mouseSequence([
        {
          type: "move",
          x: handleBox.x + handleBox.width / 2,
          y: handleBox.y + handleBox.height / 2,
          steps: 5,
        },
        { type: "down" },
        {
          type: "move",
          x: secondRowBox.x + secondRowBox.width / 2,
          y: secondRowBox.y + secondRowBox.height / 2,
          steps: 10,
        },
      ]);

      // Inserts into the paragraph above the table, shifting every position
      // after it - including the table's - while the drag is still in
      // progress.
      const view = (
        window as unknown as {
          ProseMirror: { view: EditorView };
        }
      ).ProseMirror.view;
      let firstTextblockPos: number | undefined;
      view.state.doc.descendants((node, pos) => {
        if (firstTextblockPos !== undefined) {
          return false;
        }
        if (node.isTextblock) {
          firstTextblockPos = pos + 1;
          return false;
        }
        return true;
      });
      expect(firstTextblockPos).toBeDefined();
      // Long enough that the stale table position lands inside the paragraph
      // rather than a little short of the table, which is what turns a wrong
      // position into a thrown RangeError.
      const insertedText = "X".repeat(80);
      view.dispatch(
        view.state.tr.insertText(
          insertedText,
          firstTextblockPos!,
          firstTextblockPos!,
        ),
      );

      // The next dragover recomputes the decorations against the shifted
      // document. The drop cursor still rendering proves the table position
      // was re-resolved rather than merely swallowed by a guard.
      const lastRowBox = (
        document.querySelectorAll(
          `${TABLE_SELECTOR} tbody tr`,
        )[1] as HTMLElement
      ).getBoundingClientRect();
      await mouseSequence([
        {
          type: "move",
          x: lastRowBox.x + lastRowBox.width / 2,
          y: lastRowBox.y + lastRowBox.height / 2 + 2,
          steps: 10,
        },
      ]);

      await vi.waitFor(() => {
        expect(
          document.querySelectorAll(".bn-table-drop-cursor").length,
        ).toBeGreaterThan(0);
      });

      await mouseSequence([{ type: "up" }]);

      // The concurrent edit landed, i.e. its transaction dispatched normally.
      expect(document.querySelector(EDITOR_SELECTOR)!.textContent).toContain(
        `${insertedText}Paragraph above the table`,
      );
    },
  );
});
