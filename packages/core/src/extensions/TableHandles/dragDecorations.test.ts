import { Decoration } from "prosemirror-view";
import { describe, expect, it } from "vite-plus/test";

import { getNodeById } from "../../api/nodeUtil.js";
import type { PartialBlock } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { TableDragState, getTableDragDecorations } from "./dragDecorations.js";

/**
 * @vitest-environment jsdom
 */

/**
 *  | 1-1 | 1-2 | 1-3 |
 *  | 2-1 | 2-2 | 2-3 |
 *  | 3-1 | 3-2 | 3-3 |
 */
const simpleTable: PartialBlock[] = [
  {
    id: "table-0",
    type: "table",
    content: {
      type: "tableContent",
      rows: [
        { cells: ["1-1", "1-2", "1-3"] },
        { cells: ["2-1", "2-2", "2-3"] },
        { cells: ["3-1", "3-2", "3-3"] },
      ],
    },
  },
];

const cell = (text: string, colspan = 1, rowspan = 1) =>
  ({
    type: "tableCell",
    props: { colspan, rowspan },
    content: text,
  }) as any;

/**
 *  | 1-1 |    1-2    |
 *  | 2-1 | 2-2 | 2-3 |
 *  "1-2" spans two columns.
 */
const colspanTable: PartialBlock[] = [
  {
    id: "table-0",
    type: "table",
    content: {
      type: "tableContent",
      rows: [
        { cells: [cell("1-1"), cell("1-2", 2)] },
        { cells: [cell("2-1"), cell("2-2"), cell("2-3")] },
      ],
    },
  },
];

/**
 *  | 1-1 | 1-2 | 1-3 |
 *  | 2-1 |     | 2-3 |
 *  "1-2" spans two rows.
 */
const rowspanTable: PartialBlock[] = [
  {
    id: "table-0",
    type: "table",
    content: {
      type: "tableContent",
      rows: [
        { cells: [cell("1-1"), cell("1-2", 1, 2), cell("1-3")] },
        { cells: [cell("2-1"), cell("2-3")] },
      ],
    },
  },
];

function setup(initialContent: PartialBlock[]) {
  const editor = BlockNoteEditor.create({ initialContent });
  const doc = editor.prosemirrorState.doc;
  const block = editor.getBlock("table-0")! as any;
  const tablePos = getNodeById("table-0", doc)!.posBeforeNode + 1;

  const decorationsFor = (dragState: TableDragState) =>
    getTableDragDecorations(doc, tablePos, block, dragState);

  return { editor, doc, block, tablePos, decorationsFor };
}

// Node decorations span the cell they highlight; widget decorations are a
// single point.
const sourceDecorations = (decorations: Decoration[]) =>
  decorations.filter((decoration) => decoration.from !== decoration.to);
const dropCursors = (decorations: Decoration[]) =>
  decorations.filter((decoration) => decoration.from === decoration.to);

// `Decoration.type` isn't part of prosemirror-view's public typings.
const typeOf = (decoration: Decoration) => (decoration as any).type;

const classesOf = (decorations: Decoration[]) =>
  decorations.map((decoration) => typeOf(decoration).attrs?.class);

describe("getTableDragDecorations", () => {
  describe("source highlight", () => {
    it("highlights every cell of the dragged row", () => {
      const { decorationsFor, doc } = setup(simpleTable);

      const source = sourceDecorations(
        decorationsFor({
          draggedCellOrientation: "row",
          originalIndex: 1,
          newIndex: 2,
        }),
      );

      expect(classesOf(source)).toEqual([
        "bn-table-drag-source-row",
        "bn-table-drag-source-row",
        "bn-table-drag-source-row",
      ]);
      expect(source.map((d) => doc.nodeAt(d.from)?.textContent)).toEqual([
        "2-1",
        "2-2",
        "2-3",
      ]);
    });

    it("highlights every cell of the dragged column", () => {
      const { decorationsFor, doc } = setup(simpleTable);

      const source = sourceDecorations(
        decorationsFor({
          draggedCellOrientation: "col",
          originalIndex: 1,
          newIndex: 0,
        }),
      );

      expect(classesOf(source)).toEqual([
        "bn-table-drag-source-col",
        "bn-table-drag-source-col",
        "bn-table-drag-source-col",
      ]);
      expect(source.map((d) => doc.nodeAt(d.from)?.textContent)).toEqual([
        "1-2",
        "2-2",
        "3-2",
      ]);
    });

    // The drag image is set on `dragstart`, but the first `dragover` (which is
    // what produces a target index) doesn't arrive until the cursor moves.
    it("is shown before the drag has been over the table", () => {
      const { decorationsFor } = setup(simpleTable);

      const decorations = decorationsFor({
        draggedCellOrientation: "row",
        originalIndex: 0,
        newIndex: undefined,
      });

      expect(sourceDecorations(decorations)).toHaveLength(3);
      expect(dropCursors(decorations)).toHaveLength(0);
    });

    it("is shown when hovering the row's own position", () => {
      const { decorationsFor } = setup(simpleTable);

      const decorations = decorationsFor({
        draggedCellOrientation: "row",
        originalIndex: 1,
        newIndex: 1,
      });

      expect(sourceDecorations(decorations)).toHaveLength(3);
      expect(dropCursors(decorations)).toHaveLength(0);
    });
  });

  describe("drop cursor", () => {
    it("is rendered across the target row", () => {
      const { decorationsFor } = setup(simpleTable);

      expect(
        dropCursors(
          decorationsFor({
            draggedCellOrientation: "row",
            originalIndex: 0,
            newIndex: 2,
          }),
        ),
      ).toHaveLength(3);
    });

    it("is rendered down the target column", () => {
      const { decorationsFor } = setup(simpleTable);

      expect(
        dropCursors(
          decorationsFor({
            draggedCellOrientation: "col",
            originalIndex: 2,
            newIndex: 0,
          }),
        ),
      ).toHaveLength(3);
    });

    it("renders a bar spanning the cell", () => {
      const { decorationsFor } = setup(simpleTable);

      const [widget] = dropCursors(
        decorationsFor({
          draggedCellOrientation: "row",
          originalIndex: 0,
          newIndex: 1,
        }),
      );
      const element = typeOf(widget).toDOM(
        null,
        () => widget.from,
      ) as HTMLElement;

      expect(element.className).toBe("bn-table-drop-cursor");
      expect(element.style.height).toBe("4px");
      // Dropping below the original position, so the bar sits on the bottom
      // edge of the target row.
      expect(element.style.bottom).toBe("-2px");
    });
  });

  describe("merged cells", () => {
    it("highlights the cell spanning the dragged column", () => {
      const { decorationsFor, doc } = setup(colspanTable);

      const source = sourceDecorations(
        decorationsFor({
          draggedCellOrientation: "col",
          originalIndex: 1,
          newIndex: undefined,
        }),
      );

      // The spanning cell is part of both column 1 and column 2, so dragging
      // column 1 highlights it alongside the regular cell below.
      expect(source.map((d) => doc.nodeAt(d.from)?.textContent)).toEqual([
        "1-2",
        "2-2",
      ]);
    });

    it("highlights the cell spanning the dragged row", () => {
      const { decorationsFor, doc } = setup(rowspanTable);

      const source = sourceDecorations(
        decorationsFor({
          draggedCellOrientation: "row",
          originalIndex: 1,
          newIndex: undefined,
        }),
      );

      expect(source.map((d) => doc.nodeAt(d.from)?.textContent)).toEqual([
        "2-1",
        "1-2",
        "2-3",
      ]);
    });

    it("omits the drop cursor when the column can't be dropped there", () => {
      const { decorationsFor } = setup(colspanTable);

      const decorations = decorationsFor({
        draggedCellOrientation: "col",
        originalIndex: 0,
        newIndex: 1,
      });

      // Dropping column 0 into the middle of the column-spanning cell would
      // tear it in half, so the move is blocked and only the source highlight
      // is shown.
      expect(sourceDecorations(decorations).length).toBeGreaterThan(0);
      expect(dropCursors(decorations)).toHaveLength(0);
    });
  });

  describe("stale table position", () => {
    // `tablePos` is captured on mousemove, which doesn't fire during a native
    // drag - so a concurrent edit elsewhere in the document can leave it
    // pointing past the end of the doc, or at some other node.
    it("returns no decorations when the position is out of range", () => {
      const { doc, block } = setup(simpleTable);

      expect(
        getTableDragDecorations(doc, doc.content.size + 100, block, {
          draggedCellOrientation: "row",
          originalIndex: 0,
          newIndex: 1,
        }),
      ).toEqual([]);
    });

    it("returns no decorations when the position isn't a table", () => {
      const { doc, block } = setup([
        { id: "paragraph-0", type: "paragraph", content: "Hello" },
        ...simpleTable,
      ]);

      const paragraphPos = getNodeById("paragraph-0", doc)!.posBeforeNode + 1;

      expect(
        getTableDragDecorations(doc, paragraphPos, block, {
          draggedCellOrientation: "row",
          originalIndex: 0,
          newIndex: 1,
        }),
      ).toEqual([]);
    });
  });
});
