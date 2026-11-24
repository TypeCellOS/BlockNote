import { afterEach, expect, test } from "vite-plus/test";

import "../../style.css";
import "../../fonts/inter.css";
import "../../../../react/src/editor/styles.css";
import type { PartialBlock } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { TableHandlesExtension } from "./TableHandles.js";

const fixtures: { editor: BlockNoteEditor; container: HTMLElement }[] = [];

// Bridge the browser matcher to the repository's bundled vitest typings.
const expectElement = (
  expect as unknown as {
    element(
      this: void,
      element: Element,
    ): {
      toMatchScreenshot(name: string): Promise<void>;
    };
  }
).element;

afterEach(() => {
  for (const { editor, container } of fixtures.splice(0)) {
    editor._tiptapEditor.destroy();
    container.remove();
  }
});

function createEditor() {
  const container = document.createElement("div");
  container.className = "bn-root bn-container";
  document.body.appendChild(container);
  const initialContent: PartialBlock[] = [
    {
      id: "table",
      type: "table",
      props: { textColor: "red" },
      content: {
        type: "tableContent",
        columnWidths: [140, 160, 140],
        rows: [
          {
            cells: [
              {
                type: "tableCell",
                props: { backgroundColor: "blue" },
                content: "first  line\nsecond line",
              },
              { type: "tableCell", content: "https://example.com/".repeat(8) },
              { type: "tableCell", content: "last cell" },
            ],
          },
          { cells: ["another\nmultiline cell", "middle", "right"] },
          { cells: ["bottom left", "bottom middle", "bottom right"] },
        ],
      },
    },
  ];
  const editor = BlockNoteEditor.create({ initialContent });
  editor.mount(container);
  fixtures.push({ editor, container });
  return editor;
}

function startDrag(editor: BlockNoteEditor, orientation: "row" | "col") {
  editor.prosemirrorView.dom
    .querySelector("td, th")!
    .dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
  const handles = editor.getExtension(TableHandlesExtension)!;
  const transfer = new DataTransfer();
  let preview: Element | undefined;
  transfer.setDragImage = (image) => {
    preview = image;
  };
  const event = { dataTransfer: transfer, clientX: 0, clientY: 0 };
  if (orientation === "row") {
    handles.rowDragStart(event);
  } else {
    handles.colDragStart(event);
  }
  if (!(preview instanceof HTMLElement)) {
    throw new Error("Expected a table drag image");
  }
  return { handles, transfer, preview };
}

function dragOver(cell: Element, dataTransfer: DataTransfer) {
  const box = cell.getBoundingClientRect();
  cell.dispatchEvent(
    new DragEvent("dragover", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
      clientX: box.x + box.width / 2,
      clientY: box.y + box.height / 2,
    }),
  );
}

for (const orientation of ["row", "col"] as const) {
  test(`previews the ${orientation}, updates its drop cursor and cleans up`, async () => {
    const editor = createEditor();
    await document.fonts.ready;
    const root = editor.prosemirrorView.dom;
    const rows = root.querySelectorAll("tr");
    const originals =
      orientation === "row"
        ? Array.from(rows[0].children)
        : Array.from(rows, (row) => row.children[0]);
    const source = originals[0];
    const background = getComputedStyle(source).backgroundColor;
    source.classList.add("selectedCell");
    const handle = document.createElement("div");
    handle.className = "column-resize-handle";
    source.appendChild(handle);
    const { handles, transfer, preview } = startDrag(editor, orientation);
    const clones = Array.from(preview.querySelectorAll("td"));
    expect(clones.map((cell) => cell.textContent)).toEqual(
      originals.map((cell) => cell.textContent),
    );
    expect(preview.parentElement).toBe(root.parentElement);
    expect(
      preview.querySelector(
        ".selectedCell, .column-resize-handle, [contenteditable]",
      ),
    ).toBeNull();
    for (const [index, clone] of clones.entries()) {
      const original = originals[index];
      expect(clone.getBoundingClientRect().width).toBeCloseTo(
        original.getBoundingClientRect().width,
        0,
      );
      expect(clone.scrollWidth).toBeLessThanOrEqual(clone.clientWidth);
      expect(getComputedStyle(clone).backgroundColor).toBe(
        getComputedStyle(original).backgroundColor,
      );
      for (const property of ["whiteSpace", "overflowWrap", "color"] as const) {
        expect(getComputedStyle(clone.querySelector("p")!)[property]).toBe(
          getComputedStyle(original.querySelector("p")!)[property],
        );
      }
    }
    const sourceSelector = `.bn-table-drag-source-${orientation}`;
    expect(root.querySelectorAll(sourceSelector)).toHaveLength(3);
    expect(preview.querySelector(sourceSelector)).toBeNull();
    expect(getComputedStyle(source).backgroundColor).toBe(background);
    expect(getComputedStyle(source).backgroundImage).toContain(
      "linear-gradient",
    );
    dragOver(
      orientation === "row" ? rows[2].children[0] : rows[0].children[2],
      transfer,
    );
    expect(root.querySelectorAll(".bn-table-drop-cursor")).toHaveLength(3);
    dragOver(source, transfer);
    expect(root.querySelector(".bn-table-drop-cursor")).toBeNull();
    expect(root.querySelectorAll(sourceSelector)).toHaveLength(3);

    // Photograph the native capture element on-screen, without the live table
    // behind its transparent cells. Cleanup belongs to afterEach if this fails.
    preview.style.cssText += ";position:fixed;top:20px;left:20px;z-index:9999";
    root.style.visibility = "hidden";
    await expectElement(preview).toMatchScreenshot(
      `table-${orientation}-preview-wrapped-text`,
    );
    handles.dragEnd();
    expect(preview.isConnected).toBe(false);
    expect(root.querySelector(sourceSelector)).toBeNull();
    expect(getComputedStyle(root.querySelector("td")!).backgroundImage).toBe(
      "none",
    );
  });
}

test("replaces previews per editor and removes them when the table is deleted", () => {
  const first = createEditor();
  const second = createEditor();
  const old = startDrag(first, "row").preview;
  const replacement = startDrag(first, "row");
  expect(old.isConnected).toBe(false);
  const other = startDrag(second, "col");
  other.handles.dragEnd();
  expect(other.preview.isConnected).toBe(false);
  expect(replacement.preview.isConnected).toBe(true);
  first.replaceBlocks(
    ["table"],
    [{ type: "paragraph", content: "replacement" }],
  );
  expect(replacement.preview.isConnected).toBe(false);
  expect(() => replacement.handles.dragEnd()).not.toThrow();
});

test("keeps a merged header's dimensions without its spans", () => {
  const editor = createEditor();
  editor.updateBlock("table", {
    type: "table",
    content: {
      type: "tableContent",
      headerRows: 1,
      rows: [
        {
          cells: [
            {
              type: "tableCell",
              props: { colspan: 2 },
              content: ["Merged header"],
            },
            { type: "tableCell", content: ["Other header"] },
          ],
        },
        { cells: ["one", "two", "three"] },
      ],
    },
  });
  const original = editor.prosemirrorView.dom.querySelector("th")!;
  const { preview } = startDrag(editor, "row");
  const clone = preview.querySelector("th")!;
  expect(clone.textContent).toBe("Merged header");
  expect(clone.getBoundingClientRect().width).toBeCloseTo(
    original.getBoundingClientRect().width,
    0,
  );
  expect(clone.getBoundingClientRect().height).toBeCloseTo(
    original.getBoundingClientRect().height,
    0,
  );
  expect(clone.hasAttribute("colspan")).toBe(false);
});

test("renders the source tint and drop cursor in both themes", async () => {
  const editor = createEditor();
  const root = editor.prosemirrorView.dom;
  const themeRoot = root.closest<HTMLElement>(".bn-root")!;
  await document.fonts.ready;
  const { handles, transfer } = startDrag(editor, "row");
  dragOver(root.querySelectorAll("tr")[2].children[0], transfer);
  for (const theme of ["light", "dark"] as const) {
    themeRoot.dataset.colorScheme = theme;
    expect(getComputedStyle(root).backgroundColor).toBe(
      theme === "dark" ? "rgb(31, 31, 31)" : "rgb(255, 255, 255)",
    );
    await expectElement(root.querySelector("table")!).toMatchScreenshot(
      `table-row-drag-in-progress-${theme}`,
    );
  }
  handles.dragEnd();
});
