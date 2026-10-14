import { describe, expect, it } from "vite-plus/test";

import type { DefaultInlineContentSchema } from "../../blocks/defaultBlocks.js";
import { CommentMark } from "../../comments/mark.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { createExtension } from "../../editor/BlockNoteExtension.js";
import type { PartialTableContent } from "../../schema/index.js";
import { TableHandlesView } from "./TableHandles.js";

/**
 * @vitest-environment jsdom
 */

function createEditor(
  content: PartialTableContent<DefaultInlineContentSchema> = {
    type: "tableContent",
    columnWidths: [100, 200],
    rows: [{ cells: ["a", "b"] }, { cells: ["c", "d"] }],
  },
) {
  const editor = BlockNoteEditor.create({
    extensions: [
      createExtension({ key: "commentMark", tiptapExtensions: [CommentMark] }),
    ],
  });
  editor.mount(document.body.appendChild(document.createElement("div")));
  editor.replaceBlocks(editor.document, [
    { id: "table", type: "table", content },
  ]);

  // Comment on the "a" cell.
  const { state } = editor.prosemirrorView;
  let from = -1;
  state.doc.descendants((node, pos) => {
    if (node.isText && node.text === "a") {
      from = pos;
    }
  });
  editor.prosemirrorView.dispatch(
    state.tr.addMark(
      from,
      from + 1,
      state.schema.marks.comment.create({ threadId: "thread" }),
    ),
  );

  return editor;
}

// Simulates dropping a row/column handle that was dragged from `from` to `to`.
function drop(
  editor: BlockNoteEditor<any, any, any>,
  orientation: "row" | "col",
  from: number,
  to: number,
) {
  const view = (editor.prosemirrorView as any).pluginViews.find(
    (v: unknown) => v instanceof TableHandlesView,
  ) as TableHandlesView;
  // What hovering the table sets up.
  view.tableId = "table";
  view.tableElement =
    editor.prosemirrorView.dom.querySelector<HTMLElement>('[data-id="table"]')!;
  view.state = {
    show: true,
    showAddOrRemoveRowsButton: false,
    showAddOrRemoveColumnsButton: false,
    referencePosCell: undefined,
    referencePosTable: new DOMRect(),
    block: editor.getBlock("table") as any,
    rowIndex: orientation === "row" ? to : 0,
    colIndex: orientation === "col" ? to : 0,
    draggingState: {
      draggedCellOrientation: orientation,
      originalIndex: from,
      mousePos: 0,
    },
    widgetContainer: undefined,
  };
  return view.dropHandler(new Event("drop") as DragEvent);
}

// Text of each cell, with the thread ID of any comment on it and the cell's
// span if it's a merged cell.
function cells(editor: BlockNoteEditor<any, any, any>) {
  const rows: string[][] = [];
  let span = "";
  editor.prosemirrorState.doc.descendants((node) => {
    if (node.type.name === "tableRow") {
      rows.push([]);
    }
    if (node.type.name === "tableCell") {
      const { colspan, rowspan } = node.attrs;
      span = colspan > 1 || rowspan > 1 ? `[${colspan}x${rowspan}]` : "";
    }
    if (node.isText) {
      const comment = node.marks.find((m) => m.type.name === "comment");
      rows[rows.length - 1].push(
        node.text! + (comment ? `@${comment.attrs.threadId}` : "") + span,
      );
    }
  });
  return rows;
}

describe("Table handles drag & drop", () => {
  it("keeps comments when moving a row", () => {
    const editor = createEditor();

    expect(drop(editor, "row", 0, 1)).toBe(true);

    expect(cells(editor)).toEqual([
      ["c", "d"],
      ["a@thread", "b"],
    ]);
    editor._tiptapEditor.destroy();
  });

  it("keeps comments and column widths when moving a column", () => {
    const editor = createEditor();

    expect(drop(editor, "col", 0, 1)).toBe(true);

    expect(cells(editor)).toEqual([
      ["b", "a@thread"],
      ["d", "c"],
    ]);
    expect((editor.getBlock("table") as any).content.columnWidths).toEqual([
      200, 100,
    ]);
    editor._tiptapEditor.destroy();
  });

  describe("with merged cells", () => {
    it("moves a column past a cell spanning two columns", () => {
      const editor = createEditor({
        type: "tableContent",
        rows: [
          {
            cells: [
              { type: "tableCell", content: "a", props: { colspan: 2 } },
              { type: "tableCell", content: "b" },
            ],
          },
          { cells: ["c", "d", "e"] },
        ],
      });

      // The handle indices count cells, so column 1 is the one holding "b".
      expect(drop(editor, "col", 1, 0)).toBe(true);

      expect(cells(editor)).toEqual([
        ["b", "a@thread[2x1]"],
        ["e", "c", "d"],
      ]);
      editor._tiptapEditor.destroy();
    });

    it("moves a row past a cell spanning two rows", () => {
      const editor = createEditor({
        type: "tableContent",
        rows: [
          {
            cells: [
              { type: "tableCell", content: "a", props: { rowspan: 2 } },
              { type: "tableCell", content: "b" },
            ],
          },
          { cells: ["c"] },
          { cells: ["d", "e"] },
        ],
      });

      expect(drop(editor, "row", 2, 0)).toBe(true);

      expect(cells(editor)).toEqual([
        ["d", "e"],
        ["a@thread[1x2]", "b"],
        ["c"],
      ]);
      editor._tiptapEditor.destroy();
    });

    it("doesn't drop a row into the middle of a cell spanning two rows", () => {
      const editor = createEditor({
        type: "tableContent",
        rows: [
          { cells: ["a", "b"] },
          {
            cells: [
              { type: "tableCell", content: "c", props: { rowspan: 2 } },
              { type: "tableCell", content: "d" },
            ],
          },
          { cells: ["e"] },
        ],
      });

      expect(drop(editor, "row", 0, 1)).toBe(false);

      expect(cells(editor)).toEqual([
        ["a@thread", "b"],
        ["c[1x2]", "d"],
        ["e"],
      ]);
      editor._tiptapEditor.destroy();
    });
  });
});
