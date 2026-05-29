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

beforeEach(async () => {
  render(<App />);
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
});
