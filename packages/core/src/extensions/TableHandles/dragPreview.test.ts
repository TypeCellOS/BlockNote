import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import {
  getCellsAtColumnHandle,
  getCellsAtRowHandle,
} from "../../api/blockManipulation/tables/tables.js";
import type { PartialBlock } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { TableHandlesExtension } from "./TableHandles.js";
import { setTableDragImage, unsetTableDragImage } from "./dragPreview.js";

/**
 * @vitest-environment jsdom
 */

/**
 *  | 1-1 | 1-2 | 1-3 |
 *  | 2-1 | 2-2 | 2-3 |
 */
const testDocument: PartialBlock[] = [
  {
    id: "table-0",
    type: "table",
    content: {
      type: "tableContent",
      rows: [
        { cells: ["1-1", "1-2", "1-3"] },
        { cells: ["2-1", "2-2", "2-3"] },
      ],
    },
  },
];

let editor: BlockNoteEditor;
let mountPoint: HTMLDivElement;

beforeEach(() => {
  // jsdom does no layout, so it implements neither of these. Hovering a cell
  // means dispatching a real bubbling mousemove, which other plugins (the side
  // menu, prosemirror-tables' cell selection) also listen for - and they hit
  // test the pointer position.
  (document as any).elementFromPoint = () => null;
  (document as any).elementsFromPoint = () => [];

  mountPoint = document.createElement("div");
  document.body.appendChild(mountPoint);

  editor = BlockNoteEditor.create({ initialContent: testDocument });
  editor.mount(mountPoint);
});

afterEach(() => {
  unsetTableDragImage();
  editor._tiptapEditor.destroy();
  editor = undefined as any;
  mountPoint.remove();
});

const blockElement = () =>
  editor.prosemirrorView.dom.querySelector<HTMLElement>('[data-id="table-0"]')!;

const previewRows = (preview: HTMLElement) =>
  Array.from(preview.querySelectorAll("tr")).map((row) =>
    Array.from(row.children).map((cell) => cell.textContent),
  );

describe("setTableDragImage", () => {
  it("builds a single-row snapshot of the dragged row", () => {
    const block = editor.getBlock("table-0")! as any;

    const preview = setTableDragImage(
      editor.prosemirrorView,
      blockElement(),
      getCellsAtRowHandle(block, 1),
      "row",
    )!;

    expect(preview).toBeDefined();
    expect(previewRows(preview)).toEqual([["2-1", "2-2", "2-3"]]);
  });

  it("builds a single-column snapshot of the dragged column", () => {
    const block = editor.getBlock("table-0")! as any;

    const preview = setTableDragImage(
      editor.prosemirrorView,
      blockElement(),
      getCellsAtColumnHandle(block, 2),
      "col",
    )!;

    expect(previewRows(preview)).toEqual([["1-3"], ["2-3"]]);
  });

  it("attaches the snapshot to the document so it can be captured", () => {
    const block = editor.getBlock("table-0")! as any;

    // `DataTransfer.setDragImage` only works with an element that's in the
    // document.
    const preview = setTableDragImage(
      editor.prosemirrorView,
      blockElement(),
      getCellsAtRowHandle(block, 0),
      "row",
    )!;

    expect(preview.isConnected).toBe(true);
    expect(preview.className).toContain("bn-drag-preview");
    expect(preview.className).toContain("bn-table-drag-preview");

    unsetTableDragImage();

    expect(preview.isConnected).toBe(false);
  });

  it("replaces a previous snapshot rather than stacking them", () => {
    const block = editor.getBlock("table-0")! as any;
    const cells = getCellsAtRowHandle(block, 0);

    const first = setTableDragImage(
      editor.prosemirrorView,
      blockElement(),
      cells,
      "row",
    )!;
    const second = setTableDragImage(
      editor.prosemirrorView,
      blockElement(),
      cells,
      "row",
    )!;

    expect(first.isConnected).toBe(false);
    expect(second.isConnected).toBe(true);
  });

  it("returns undefined when the table's DOM can't be read", () => {
    const block = editor.getBlock("table-0")! as any;

    expect(
      setTableDragImage(
        editor.prosemirrorView,
        document.createElement("div"),
        getCellsAtRowHandle(block, 0),
        "row",
      ),
    ).toBeUndefined();
  });
});

describe("drag start", () => {
  // The handles only know which row/column they're on from having been hovered,
  // so a drag can't start without a mousemove over the table first.
  function hoverCell(row: number, col: number) {
    const cell = blockElement().querySelectorAll("tr")[row].children[col];

    cell.dispatchEvent(
      new MouseEvent("mousemove", { bubbles: true, clientX: 0, clientY: 0 }),
    );
  }

  function stubDataTransfer() {
    const setDragImage: {
      calls: [Element, number, number][];
    } = { calls: [] };

    return {
      dataTransfer: {
        setDragImage: (image: Element, x: number, y: number) =>
          setDragImage.calls.push([image, x, y]),
        effectAllowed: "",
      } as unknown as DataTransfer,
      setDragImage,
    };
  }

  it("hands the row snapshot to the drag event", () => {
    const tableHandles = editor.getExtension(TableHandlesExtension)!;
    hoverCell(1, 0);

    const { dataTransfer, setDragImage } = stubDataTransfer();
    tableHandles.rowDragStart({ dataTransfer, clientY: 0 });

    expect(setDragImage.calls).toHaveLength(1);
    const [image, x, y] = setDragImage.calls[0];
    expect(previewRows(image as HTMLElement)).toEqual([["2-1", "2-2", "2-3"]]);
    expect([x, y]).toEqual([16, 16]);

    tableHandles.dragEnd();

    expect(image.isConnected).toBe(false);
  });

  it("hands the column snapshot to the drag event", () => {
    const tableHandles = editor.getExtension(TableHandlesExtension)!;
    hoverCell(0, 1);

    const { dataTransfer, setDragImage } = stubDataTransfer();
    tableHandles.colDragStart({ dataTransfer, clientX: 0 });

    const [image] = setDragImage.calls[0];
    expect(previewRows(image as HTMLElement)).toEqual([["1-2"], ["2-2"]]);

    tableHandles.dragEnd();

    expect(image.isConnected).toBe(false);
  });

  it("leaves the source highlight out of the snapshot", () => {
    const tableHandles = editor.getExtension(TableHandlesExtension)!;
    hoverCell(1, 0);

    const { dataTransfer, setDragImage } = stubDataTransfer();
    tableHandles.rowDragStart({ dataTransfer, clientY: 0 });

    // The cells are cloned after the highlight decoration has been applied, so
    // the snapshot has to drop it - it should look like the row, not like the
    // row's drag state.
    const [image] = setDragImage.calls[0];
    expect(image.querySelectorAll(".bn-table-drag-source-row")).toHaveLength(0);

    tableHandles.dragEnd();
  });

  it("renders the source highlight from the moment the drag starts", () => {
    const tableHandles = editor.getExtension(TableHandlesExtension)!;
    hoverCell(1, 0);

    const { dataTransfer } = stubDataTransfer();
    tableHandles.rowDragStart({ dataTransfer, clientY: 0 });

    expect(
      editor.prosemirrorView.dom.querySelectorAll(".bn-table-drag-source-row"),
    ).toHaveLength(3);

    tableHandles.dragEnd();

    expect(
      editor.prosemirrorView.dom.querySelectorAll(".bn-table-drag-source-row"),
    ).toHaveLength(0);
  });
});
