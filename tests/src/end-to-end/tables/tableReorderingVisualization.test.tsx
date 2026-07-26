import TableReorderingApp from "@examples/03-ui-components/21-table-reordering-visualization/src/App";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { browserName, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR, TABLE_SELECTOR } from "../../utils/const.js";
import { waitForSelector } from "../../utils/editor.js";
import { mouseSequence, moveMouseOverElement } from "../../utils/mouse.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

// This example lives at examples/03-ui-components/21-table-reordering-visualization.
// It adds two ProseMirror-decoration-based enhancements on top of BlockNote's
// own table drag handles (a tint on the row/column being dragged, and a real
// floating drag image instead of the default invisible one), plus a
// slash-menu override so new tables default to a header row. These tests
// cover the parts that enhancement actually touches; they don't re-test
// BlockNote's own move/reorder logic (already covered by tables.test.tsx).
//
// Playwright doesn't correctly simulate drag events in Firefox, matching the
// existing skip condition in tables.test.tsx for the same reason.
const skipDrag = browserName === "firefox";

async function getRowHandle(cell: HTMLElement): Promise<HTMLElement> {
  await moveMouseOverElement(cell);
  return vi.waitFor(() => {
    const candidate = Array.from(
      document.querySelectorAll<HTMLElement>(".bn-table-handle"),
    ).find((el) => !el.style.transform.includes("rotate"));
    if (!candidate) {
      throw new Error("Row drag handle not visible");
    }
    return candidate;
  });
}

async function getColumnHandle(cell: HTMLElement): Promise<HTMLElement> {
  await moveMouseOverElement(cell);
  return vi.waitFor(() => {
    const candidate = Array.from(
      document.querySelectorAll<HTMLElement>(".bn-table-handle"),
    ).find((el) => el.style.transform.includes("rotate"));
    if (!candidate) {
      throw new Error("Column drag handle not visible");
    }
    return candidate;
  });
}

function centerOf(el: Element) {
  const box = el.getBoundingClientRect();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

beforeEach(async () => {
  await render(<TableReorderingApp />);
  await waitForSelector(EDITOR_SELECTOR);
  await waitForSelector(TABLE_SELECTOR);
});

describe("Table reordering visualization", () => {
  test.skipIf(skipDrag)(
    "dragging a row tints it and shows a colored drop cursor",
    async () => {
      const rows = document.querySelectorAll(`${TABLE_SELECTOR} tbody tr`);
      const cell = rows[1].querySelector("td") as HTMLElement;
      const handle = await getRowHandle(cell);
      const handleCenter = centerOf(handle);

      await mouseSequence([
        { type: "move", x: handleCenter.x, y: handleCenter.y, steps: 5 },
        { type: "down" },
      ]);

      // Move onto a different row to trigger the drop-cursor decoration and
      // confirm the source row is tinted while the drag is in progress.
      const targetRow = rows[3].querySelector("td") as HTMLElement;
      const targetCenter = centerOf(targetRow);
      await mouseSequence([
        { type: "move", x: targetCenter.x, y: targetCenter.y, steps: 10 },
      ]);

      await vi.waitFor(() => {
        if (
          document.querySelectorAll(".bn-table-drag-source-row").length === 0
        ) {
          throw new Error("Source row not tinted yet");
        }
      });
      await vi.waitFor(() => {
        if (document.querySelectorAll(".bn-table-drop-cursor").length === 0) {
          throw new Error("Drop cursor not shown yet");
        }
      });

      await mouseSequence([{ type: "up" }]);

      // Both decorations are transient - once the drop completes, neither
      // should remain on any row/column. Cleanup runs off a `dragend`/state
      // update, not synchronously with the mouseup, so wait for it.
      await vi.waitFor(() => {
        expect(
          document.querySelectorAll(".bn-table-drag-source-row"),
        ).toHaveLength(0);
        expect(document.querySelectorAll(".bn-table-drop-cursor")).toHaveLength(
          0,
        );
      });
    },
  );

  test.skipIf(skipDrag)(
    "dragging a column tints every cell in that column",
    async () => {
      const firstRowCells = document.querySelectorAll(
        `${TABLE_SELECTOR} tbody tr:first-child td, ${TABLE_SELECTOR} tbody tr:first-child th`,
      );
      const cell = firstRowCells[0] as HTMLElement;
      const handle = await getColumnHandle(cell);
      const handleCenter = centerOf(handle);

      await mouseSequence([
        { type: "move", x: handleCenter.x, y: handleCenter.y, steps: 5 },
        { type: "down" },
      ]);

      const targetCell = firstRowCells[2] as HTMLElement;
      const targetCenter = centerOf(targetCell);
      await mouseSequence([
        { type: "move", x: targetCenter.x, y: targetCenter.y, steps: 10 },
      ]);

      const rowCount = document.querySelectorAll(
        `${TABLE_SELECTOR} tbody tr`,
      ).length;
      await vi.waitFor(() => {
        const marked = document.querySelectorAll(".bn-table-drag-source-col");
        if (marked.length !== rowCount) {
          throw new Error(
            `Expected ${rowCount} tinted cells, got ${marked.length}`,
          );
        }
      });

      await mouseSequence([{ type: "up" }]);
      await vi.waitFor(() => {
        expect(
          document.querySelectorAll(".bn-table-drag-source-col"),
        ).toHaveLength(0);
      });
    },
  );

  test.skipIf(skipDrag)(
    "cancelling a drag with Escape still cleans up the tint",
    async () => {
      const rows = document.querySelectorAll(`${TABLE_SELECTOR} tbody tr`);
      const cell = rows[1].querySelector("td") as HTMLElement;
      const handle = await getRowHandle(cell);
      const handleCenter = centerOf(handle);

      await mouseSequence([
        { type: "move", x: handleCenter.x, y: handleCenter.y, steps: 5 },
        { type: "down" },
      ]);
      const targetRow = rows[2].querySelector("td") as HTMLElement;
      const targetCenter = centerOf(targetRow);
      await mouseSequence([
        { type: "move", x: targetCenter.x, y: targetCenter.y, steps: 10 },
      ]);
      await vi.waitFor(() => {
        if (
          document.querySelectorAll(".bn-table-drag-source-row").length === 0
        ) {
          throw new Error("Source row not tinted yet");
        }
      });

      // Escape cancels a native HTML5 drag: the browser fires `dragend`
      // without a `drop`. Our cleanup is tied to the same lifecycle BlockNote
      // itself uses (`dragEnd()`), so it should fire here too.
      await userEvent.keyboard("{Escape}");
      // Release the mouse button so it doesn't leak into the next test.
      await mouseSequence([{ type: "up" }]);

      await vi.waitFor(() => {
        if (
          document.querySelectorAll(".bn-table-drag-source-row").length !== 0
        ) {
          throw new Error("Tint was not cleaned up after cancelled drag");
        }
      });
    },
  );

  test.skipIf(skipDrag)(
    "dragging a row with rich/nested cell content doesn't throw",
    async () => {
      // Put the text cursor in the first data row and format it, to give the
      // dragged row non-trivial (bold) inline content rather than plain text.
      const rows = document.querySelectorAll(`${TABLE_SELECTOR} tbody tr`);
      const cell = rows[1].querySelector("td") as HTMLElement;
      await userEvent.click(cell);
      await userEvent.keyboard("{Control>}a{/Control}");
      await userEvent.keyboard("{Control>}b{/Control}");

      const handle = await getRowHandle(cell);
      const handleCenter = centerOf(handle);
      await mouseSequence([
        { type: "move", x: handleCenter.x, y: handleCenter.y, steps: 5 },
        { type: "down" },
      ]);
      const targetRow = rows[2].querySelector("td") as HTMLElement;
      const targetCenter = centerOf(targetRow);
      await mouseSequence([
        { type: "move", x: targetCenter.x, y: targetCenter.y, steps: 10 },
        { type: "up" },
      ]);

      // No assertion beyond "didn't throw" - vitest-browser surfaces any
      // uncaught page error as a test failure on its own.
      await vi.waitFor(() => {
        if (
          document.querySelectorAll(".bn-table-drag-source-row").length !== 0
        ) {
          throw new Error("Tint should have cleared after the drop");
        }
      });
    },
  );

  // Not covered by an automated test: BlockNote's own TableHandlesExtension
  // stores `view.tablePos` (and `state.block`) once per mousemove and never
  // remaps them through `tr.mapping`. A transaction that changes the
  // document elsewhere while a drag is in progress - a concurrent local or
  // collaborative edit - leaves them stale; the *next* dragover recomputes
  // BlockNote's own drop-cursor decoration from that stale position and
  // throws (confirmed via a manual repro: dispatching an unrelated
  // transaction mid-drag throws a RangeError out of
  // `TableHandles.ts`'s `decorations()`, before our own plugin's
  // decorations ever run in that same view update). Our `tr.mapping` fix
  // above keeps *our* plugin's state correct for when this is fixed
  // upstream, but there's no way to exercise it in isolation while core's
  // own code throws first - see the PR discussion for the upstream report.

  test.skipIf(skipDrag)(
    "dragging a column with a merged (rowspan) cell doesn't throw",
    async () => {
      // Build a deterministic 3-row x 2-col table where the first cell of
      // column 0 spans 2 rows, the same way tables.test.tsx's row-drag test
      // seeds a deterministic table directly via ProseMirror rather than
      // driving the merge-cells UI.
      const cellAttrs = {
        textColor: "default",
        backgroundColor: "default",
        textAlignment: "left",
        colspan: 1,
        rowspan: 1,
        colwidth: null,
      };
      const mergedCellAttrs = { ...cellAttrs, rowspan: 2 };
      const rowsContent = [
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              attrs: mergedCellAttrs,
              content: [
                {
                  type: "tableParagraph",
                  content: [{ type: "text", text: "Merged" }],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: cellAttrs,
              content: [
                {
                  type: "tableParagraph",
                  content: [{ type: "text", text: "R1C2" }],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              attrs: cellAttrs,
              content: [
                {
                  type: "tableParagraph",
                  content: [{ type: "text", text: "R2C2" }],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              attrs: cellAttrs,
              content: [
                {
                  type: "tableParagraph",
                  content: [{ type: "text", text: "R3C1" }],
                },
              ],
            },
            {
              type: "tableCell",
              attrs: cellAttrs,
              content: [
                {
                  type: "tableParagraph",
                  content: [{ type: "text", text: "R3C2" }],
                },
              ],
            },
          ],
        },
      ];
      (
        window as unknown as {
          ProseMirror: { commands: { setContent: (doc: unknown) => void } };
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
        if (
          document.querySelectorAll(`${TABLE_SELECTOR} tbody tr`).length !== 3
        ) {
          throw new Error("Table not yet replaced");
        }
      });

      // Drag column 1 (the non-merged column) across the merged column.
      const secondColCell = document.querySelectorAll(
        `${TABLE_SELECTOR} tbody tr:first-child td`,
      )[1] as HTMLElement;
      const handle = await getColumnHandle(secondColCell);
      const handleCenter = centerOf(handle);
      await mouseSequence([
        { type: "move", x: handleCenter.x, y: handleCenter.y, steps: 5 },
        { type: "down" },
      ]);
      const firstColCell = document.querySelectorAll(
        `${TABLE_SELECTOR} tbody tr:first-child td`,
      )[0] as HTMLElement;
      const targetCenter = centerOf(firstColCell);
      await mouseSequence([
        { type: "move", x: targetCenter.x, y: targetCenter.y, steps: 10 },
        { type: "up" },
      ]);

      // No assertion beyond "didn't throw" - vitest-browser surfaces any
      // uncaught page error as a test failure on its own. BlockNote's own
      // canColumnBeDraggedInto guard is expected to block this move (you
      // can't drag a column across one containing a rowspan cell), so we
      // only assert the table wasn't left in a broken/empty state.
      await vi.waitFor(() => {
        if (
          document.querySelectorAll(`${TABLE_SELECTOR} tbody tr`).length !== 3
        ) {
          throw new Error("Table should still have 3 rows after the drag");
        }
      });
    },
  );

  test("/table defaults to a header row", async () => {
    await userEvent.click(document.querySelector(EDITOR_SELECTOR)!);
    await userEvent.keyboard("{Control>}{End}{/Control}");
    await executeSlashCommand("table");

    await vi.waitFor(() => {
      const headerCells = document.querySelectorAll(
        `${TABLE_SELECTOR} thead th, ${TABLE_SELECTOR} tbody tr:first-child th`,
      );
      if (headerCells.length === 0) {
        throw new Error("New table has no header row");
      }
    });
  });
});
