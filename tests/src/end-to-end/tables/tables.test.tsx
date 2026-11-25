import type { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { describe, expect, vi } from "vite-plus/test";
import { browserName, userEvent } from "../../utils/context.js";
import { TABLE_SELECTOR } from "../../utils/const.js";
import { focusOnEditor, waitForSelector } from "../../utils/editor.js";
import { mouseSequence, moveMouseOverElement } from "../../utils/mouse.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

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

function expectTable(editor: BlockNoteEditor, rows: string[][]) {
  expect(editor.document).toMatchObject([
    {
      type: "table",
      children: [],
      content: {
        type: "tableContent",
        columnWidths: rows[0].map(() => undefined),
        headerRows: undefined,
        headerCols: undefined,
        rows: rows.map((row) => ({
          cells: row.map((text) => ({
            type: "tableCell",
            props: { colspan: 1, rowspan: 1 },
            content: text ? [{ type: "text", text, styles: {} }] : [],
          })),
        })),
      },
    },
  ]);
}

describe("Check Table interactions", () => {
  it("Should be able to type in cell", async ({ setupEditor }) => {
    const { editor } = await setupEditor();
    await focusOnEditor();
    await executeSlashCommand("table");
    await userEvent.keyboard("Table Cell");

    expectTable(editor, [
      ["Table Cell", "", ""],
      ["", "", ""],
    ]);
  });
  it("Tab should cycle cells", async ({ setupEditor }) => {
    const { editor } = await setupEditor();
    await focusOnEditor();
    await executeSlashCommand("table");
    // Cycle to sixth (last) cell.
    await userEvent.keyboard("{Tab}".repeat(5) + "Table Cell");
    // Cycle back to first cell.
    await userEvent.keyboard("{Shift>}{Tab}{/Shift}".repeat(5) + "Table Cell");

    expectTable(editor, [
      ["Table Cell", "", ""],
      ["", "", "Table Cell"],
    ]);
  });
  it.for([
    { boundary: "last", text: "Last cell", keys: "{Tab}" },
    { boundary: "first", text: "First cell", keys: "{Shift>}{Tab}{/Shift}" },
  ] as const)(
    "keeps the caret in the $boundary cell at the table boundary",
    async ({ boundary, text, keys }, { setupEditor, selectText }) => {
      const table = makeTable([["First cell", "Last cell"]]);
      const paragraph = { id: "paragraph", content: "Sibling" };
      const { editor, rootNode } = await setupEditor({
        initialContent:
          boundary === "last"
            ? [paragraph, table]
            : [{ ...paragraph, children: [table] }],
      });
      const before = editor.document;
      const cell = rootNode.querySelectorAll(`${TABLE_SELECTOR} td`)[
        boundary === "last" ? 1 : 0
      ];
      selectText(editor, text).collapseToStart();
      editor.focus();
      function caretInCell() {
        const selection = document.getSelection();
        return (
          editor.isFocused() &&
          selection?.isCollapsed === true &&
          cell.contains(selection.anchorNode)
        );
      }
      await expect.poll(caretInCell).toBe(true);

      await userEvent.keyboard(keys);

      expect(caretInCell()).toBe(true);
      expect(editor.document).toEqual(before);
    },
  );
  it("Arrow keys should move cells", async ({ setupEditor }) => {
    const { editor } = await setupEditor();
    await focusOnEditor();
    await executeSlashCommand("table");
    // Move down to second (last) cell in column and third (last) cell in row.
    await userEvent.keyboard("{ArrowDown}{ArrowRight}{ArrowRight}Table Cell");
    // Cycle back to first cell.
    await userEvent.keyboard("{ArrowUp}{ArrowLeft}{ArrowLeft}Table Cell");

    expectTable(editor, [
      ["Table Cell", "", ""],
      ["", "", "Table Cell"],
    ]);
  });
  // Regression test for https://github.com/TypeCellOS/BlockNote/issues/2691.
  // Drops the dragged row to the LEFT of `.bn-block-group` (where the side
  // menu sits). The side menu's drop handling re-dispatches drops outside `.bn-block-group`
  // (within 250px) as synthetic events; without the guard in
  // TableHandles.dropHandler, the synthetic drop AND the original drop both
  // run the row-move logic, dragging an adjacent row along with the target.
  // Playwright doesn't correctly simulate drag events in Firefox.
  it.skipIf(browserName === "firefox")(
    "Row drag should move only the dragged row",
    async ({ setupEditor, onTestFinished }) => {
      // Seed a deterministic 5-row × 1-col table for the drag.
      await setupEditor({
        initialContent: [
          {
            type: "table",
            content: {
              type: "tableContent",
              rows: ["R1", "R2", "R3", "R4", "R5"].map((label) => ({
                cells: [label],
              })),
            },
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
      // well within the 250px drop margin that triggers the side menu's synthetic
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

      const owner = crypto.randomUUID();
      onTestFinished(() => mouseSequence([{ type: "cancel", owner }]));
      await mouseSequence([
        {
          type: "move",
          x: handleBox.x + handleBox.width / 2,
          y: handleBox.y + handleBox.height / 2,
          steps: 5,
        },
        { type: "down", owner },
        { type: "move", x: dropX, y: dropY, steps: 10, owner },
        { type: "up", owner },
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
  it.skipIf(browserName === "firefox")(
    "Add column then add row via table handle menus",
    async ({ setupEditor }) => {
      const { editor } = await setupEditor({
        initialContent: [
          makeTable([
            ["A", "B"],
            ["C", "D"],
          ]),
        ],
      });
      function firstCell() {
        return waitForSelector(`${TABLE_SELECTOR} tbody tr td`);
      }

      // Add a column to the right of the first column.
      const columnHandle = await getTableHandle(await firstCell(), "column");
      await clickTableHandleMenuItem(columnHandle, "Add column right");
      expectTable(editor, [
        ["A", "", "B"],
        ["C", "", "D"],
      ]);

      // Add a row below the first row.
      const rowHandle = await getTableHandle(await firstCell(), "row");
      await clickTableHandleMenuItem(rowHandle, "Add row below");

      expectTable(editor, [
        ["A", "", "B"],
        ["", "", ""],
        ["C", "", "D"],
      ]);
    },
  );
});

function makeTable(rows: string[][]): PartialBlock {
  return {
    id: "table",
    type: "table",
    content: {
      type: "tableContent",
      rows: rows.map((cells) => ({ cells })),
    },
  };
}

it("Enter should move to cell below", async ({ setupEditor, selectText }) => {
  const { editor } = await setupEditor({
    initialContent: [
      makeTable([
        ["Top", "", ""],
        ["", "", ""],
      ]),
    ],
  });
  selectText(editor, "Top").collapseToEnd();
  editor.focus();

  await userEvent.keyboard("{Enter}Bottom");

  expectTable(editor, [
    ["Top", "", ""],
    ["Bottom", "", ""],
  ]);
});

it("Shift+Enter should create a new line within cell", async ({
  setupEditor,
  selectText,
}) => {
  const { editor } = await setupEditor({
    initialContent: [
      makeTable([
        ["Line 1", "", ""],
        ["", "", ""],
      ]),
    ],
  });
  const cell = await waitForSelector(`${TABLE_SELECTOR} td`);
  selectText(editor, "Line 1").collapseToEnd();
  editor.focus();

  await userEvent.keyboard("{Shift>}{Enter}{/Shift}Line 2");

  expectTable(editor, [
    ["Line 1\nLine 2", "", ""],
    ["", "", ""],
  ]);
  // A line break and a second paragraph serialize to the same public text.
  expect(cell.querySelector("p")?.innerText).toBe("Line 1\nLine 2");
  expect(cell.querySelectorAll("p")).toHaveLength(1);
});
