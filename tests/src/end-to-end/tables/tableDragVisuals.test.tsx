import App from "@examples/01-basic/testing/src/App";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vite-plus/test";
import { render } from "vitest-browser-react";
import { EDITOR_SELECTOR, TABLE_SELECTOR } from "../../utils/const.js";
import { browserName, userEvent } from "../../utils/context.js";
import {
  expectElement,
  focusOnEditor,
  waitForSelector,
} from "../../utils/editor.js";
import { mouseSequence, moveMouseOverElement } from "../../utils/mouse.js";

// Feedback shown while dragging a table row/column, all of which BlockNote's
// TableHandlesExtension renders by default: a highlight on the row/column being
// dragged (`bn-table-drag-source-row` / `-col`), a bar marking where it would
// land (`bn-table-drop-cursor`), and a snapshot of it next to the cursor
// (`bn-table-drag-preview`). The reorder itself is covered by tables.test.tsx.
//
// Playwright doesn't correctly simulate drag events in Firefox, matching the
// existing skip condition in tables.test.tsx for the same reason.
const skipDrag = browserName === "firefox";

const CELL_ATTRS = {
  textColor: "default",
  backgroundColor: "default",
  textAlignment: "left",
  colspan: 1,
  rowspan: 1,
  colwidth: null,
};

// Replaces the document with a deterministic table, the same way
// tables.test.tsx seeds its row-drag test - driving the table UI to build one
// is slower and leaves the row/column count dependent on the default table.
async function seedTable(rows: string[][]) {
  const rowsContent = rows.map((cells) => ({
    type: "tableRow",
    content: cells.map((text) => ({
      type: "tableCell",
      attrs: CELL_ATTRS,
      content: [{ type: "tableParagraph", content: [{ type: "text", text }] }],
    })),
  }));

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
          // The column handles render above the table. Without a block in
          // front of it the table sits flush against the top of the editor,
          // putting them out of reach of the mouse.
          {
            type: "blockContainer",
            attrs: { id: "0" },
            content: [
              {
                type: "paragraph",
                attrs: {
                  backgroundColor: "default",
                  textColor: "default",
                  textAlignment: "left",
                },
                content: [{ type: "text", text: "Above the table" }],
              },
            ],
          },
          {
            type: "blockContainer",
            attrs: { id: "1" },
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
      document.querySelectorAll(`${TABLE_SELECTOR} tbody tr`).length !==
      rows.length
    ) {
      throw new Error("Table not yet replaced");
    }
  });
}

// Hovers `cell` to reveal the table handles, then returns the row or column
// handle. The column handle is rendered with a rotate transform on the
// `.bn-table-handle` element itself; the row handle has none.
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

function centerOf(el: Element) {
  const box = el.getBoundingClientRect();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

const cellAt = (row: number, col: number) =>
  document.querySelectorAll(`${TABLE_SELECTOR} tbody tr`)[row].children[
    col
  ] as HTMLElement;

// The decorations are scoped to the editor deliberately: the drag preview is
// built from clones of the same cells and lives outside it, so an unscoped
// selector would count both.
const SOURCE_ROW = `${EDITOR_SELECTOR} .bn-table-drag-source-row`;
const SOURCE_COL = `${EDITOR_SELECTOR} .bn-table-drag-source-col`;
const DROP_CURSOR = `${EDITOR_SELECTOR} .bn-table-drop-cursor`;
const DRAG_PREVIEW = ".bn-table-drag-preview";

const count = (selector: string) => document.querySelectorAll(selector).length;

async function waitForCount(selector: string, expected: number) {
  await vi.waitFor(() => {
    const actual = count(selector);
    if (actual !== expected) {
      throw new Error(`Expected ${expected} ${selector}, got ${actual}`);
    }
  });
}

// Presses the row/column handle for `cell` and drags onto `onto`, leaving the
// mouse button down so the drag is still in progress when this resolves.
//
// A native drag doesn't begin on mousedown - the browser only starts it once
// the pointer has moved far enough while the button is held, which is why every
// test here has to drag somewhere before it can assert anything. The state
// between `dragstart` and the first `dragover` isn't reachable through a
// synthetic mouse at all; it's covered by the jsdom tests in
// packages/core/src/extensions/TableHandles instead.
async function startDrag(
  cell: HTMLElement,
  orientation: "row" | "column",
  onto: HTMLElement,
): Promise<void> {
  const handle = await getTableHandle(cell, orientation);
  const { x, y } = centerOf(handle);
  await mouseSequence([{ type: "move", x, y, steps: 5 }, { type: "down" }]);
  await dragOver(onto);
}

/**
 * Records the element handed to `DataTransfer.setDragImage` for the next drag.
 *
 * The snapshot is removed from the page as soon as the browser has rasterized
 * it (it can't be left there hidden - Firefox and WebKit rasterize the element
 * as painted, so hiding it would hide the drag image too), which makes the spy
 * the only way to get hold of it. It's also the most direct assertion
 * available: this is the exact element the browser was asked to draw. The image
 * the user ends up seeing is composited by the OS and can't be inspected here.
 *
 * Restores itself after each test.
 */
function spyOnDragImage() {
  // Deliberately unbound - it's called back with `.call(this, ...)` below, and
  // reassigned to the prototype afterwards.
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const original = DataTransfer.prototype.setDragImage;
  let image: Element | undefined;

  DataTransfer.prototype.setDragImage = function (element, x, y) {
    image = element;
    return original.call(this, element, x, y);
  };
  restoreDragImageSpy = () => {
    DataTransfer.prototype.setDragImage = original;
  };

  return {
    captured() {
      if (!image) {
        throw new Error("No drag image was handed to setDragImage");
      }
      return image;
    },
  };
}

let restoreDragImageSpy: (() => void) | undefined;

afterEach(() => {
  restoreDragImageSpy?.();
  restoreDragImageSpy = undefined;
});

async function dragOver(cell: HTMLElement): Promise<void> {
  const { x, y } = centerOf(cell);
  await mouseSequence([{ type: "move", x, y, steps: 10 }]);
}

beforeEach(async () => {
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
  await focusOnEditor();
  await seedTable([
    ["R1C1", "R1C2", "R1C3"],
    ["R2C1", "R2C2", "R2C3"],
    ["R3C1", "R3C2", "R3C3"],
  ]);
});

describe("Table drag visuals", () => {
  test.skipIf(skipDrag)(
    "highlights the dragged row and marks the drop position",
    async () => {
      await startDrag(cellAt(1, 0), "row", cellAt(2, 0));

      // The highlight covers the whole row being dragged; the drop cursor
      // marks the row it would land on.
      await waitForCount(SOURCE_ROW, 3);
      await waitForCount(DROP_CURSOR, 3);

      await mouseSequence([{ type: "up" }]);

      // Both are transient - cleanup runs off `dragend`, not synchronously
      // with the mouseup, so wait for it.
      await waitForCount(SOURCE_ROW, 0);
      await waitForCount(DROP_CURSOR, 0);
    },
  );

  test.skipIf(skipDrag)(
    "highlights every cell of the dragged column",
    async () => {
      await startDrag(cellAt(0, 1), "column", cellAt(0, 2));

      await waitForCount(SOURCE_COL, 3);
      await waitForCount(DROP_CURSOR, 3);

      await mouseSequence([{ type: "up" }]);

      await waitForCount(SOURCE_COL, 0);
      await waitForCount(DROP_CURSOR, 0);
    },
  );

  test.skipIf(skipDrag)(
    "keeps the source highlight over an invalid drop position",
    async () => {
      await startDrag(cellAt(1, 0), "row", cellAt(2, 0));
      await waitForCount(DROP_CURSOR, 3);

      // Back onto the row's own position: there's nowhere to drop, so the drop
      // cursor goes away, but the row being dragged is still the row being
      // dragged.
      await dragOver(cellAt(1, 0));

      await waitForCount(DROP_CURSOR, 0);
      expect(count(SOURCE_ROW)).toBe(3);

      await mouseSequence([{ type: "up" }]);
      await waitForCount(SOURCE_ROW, 0);
    },
  );

  test.skipIf(skipDrag)(
    "shows a snapshot of the dragged row next to the cursor",
    async () => {
      const dragImage = spyOnDragImage();
      await startDrag(cellAt(1, 0), "row", cellAt(2, 0));
      const preview = dragImage.captured();

      // One row, holding a copy of each cell in it.
      expect(preview.querySelectorAll("tr")).toHaveLength(1);
      expect(
        Array.from(preview.querySelectorAll("td, th")).map(
          (cell) => cell.textContent,
        ),
      ).toEqual(["R2C1", "R2C2", "R2C3"]);

      // The cells are cloned after the source highlight has been applied, so
      // the snapshot has to drop it - it should look like the row, not like
      // the row's drag state.
      expect(
        preview.querySelectorAll(".bn-table-drag-source-row"),
      ).toHaveLength(0);

      await mouseSequence([{ type: "up" }]);

      await waitForCount(DRAG_PREVIEW, 0);
    },
  );

  test.skipIf(skipDrag)(
    "shows a snapshot of the dragged column next to the cursor",
    async () => {
      const dragImage = spyOnDragImage();
      await startDrag(cellAt(0, 2), "column", cellAt(0, 1));
      const preview = dragImage.captured();

      // One row per cell in the column.
      expect(preview.querySelectorAll("tr")).toHaveLength(3);
      expect(
        Array.from(preview.querySelectorAll("td, th")).map(
          (cell) => cell.textContent,
        ),
      ).toEqual(["R1C3", "R2C3", "R3C3"]);

      await mouseSequence([{ type: "up" }]);
      await waitForCount(DRAG_PREVIEW, 0);
    },
  );

  test.skipIf(skipDrag)("cancelling with Escape cleans up", async () => {
    await startDrag(cellAt(1, 0), "row", cellAt(2, 0));
    await waitForCount(SOURCE_ROW, 3);

    // Escape cancels a native HTML5 drag: the browser fires `dragend` without
    // a `drop`.
    await userEvent.keyboard("{Escape}");
    // Release the mouse button so it doesn't leak into the next test.
    await mouseSequence([{ type: "up" }]);

    await waitForCount(SOURCE_ROW, 0);
    await waitForCount(DROP_CURSOR, 0);
    await waitForCount(DRAG_PREVIEW, 0);
  });

  test.skipIf(skipDrag)("mid-drag appearance", async () => {
    await startDrag(cellAt(1, 0), "row", cellAt(2, 0));
    await waitForCount(DROP_CURSOR, 3);

    // Framed on the table rather than the whole page: the suite's screenshot
    // tolerance is a proportion of the captured area, and against a full page
    // of whitespace a recoloured drop cursor doesn't move enough pixels to
    // register.
    await expectElement(
      document.querySelector(TABLE_SELECTOR),
    ).toMatchScreenshot("tableRowDragInProgress");

    await mouseSequence([{ type: "up" }]);
  });
});
