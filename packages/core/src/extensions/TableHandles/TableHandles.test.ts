import { describe, expect, it } from "vite-plus/test";

import { CommentMark } from "../../comments/mark.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { createExtension } from "../../editor/BlockNoteExtension.js";
import { TableHandlesView } from "./TableHandles.js";

/**
 * @vitest-environment jsdom
 */

function createEditor() {
  const editor = BlockNoteEditor.create({
    extensions: [
      createExtension({ key: "commentMark", tiptapExtensions: [CommentMark] }),
    ],
  });
  editor.mount(document.body.appendChild(document.createElement("div")));
  editor.replaceBlocks(editor.document, [
    {
      id: "table",
      type: "table",
      content: {
        type: "tableContent",
        columnWidths: [100, 200],
        rows: [{ cells: ["a", "b"] }, { cells: ["c", "d"] }],
      },
    },
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
  expect(view.dropHandler(new Event("drop") as DragEvent)).toBe(true);
}

// Text of each cell, with the thread ID of any comment on it.
function cells(editor: BlockNoteEditor<any, any, any>) {
  const rows: string[][] = [];
  editor.prosemirrorState.doc.descendants((node) => {
    if (node.type.name === "tableRow") {
      rows.push([]);
    }
    if (node.isText) {
      const comment = node.marks.find((m) => m.type.name === "comment");
      rows[rows.length - 1].push(
        node.text! + (comment ? `@${comment.attrs.threadId}` : ""),
      );
    }
  });
  return rows;
}

describe("Table handles drag & drop", () => {
  it("keeps comments when moving a row", () => {
    const editor = createEditor();

    drop(editor, "row", 0, 1);

    expect(cells(editor)).toEqual([
      ["c", "d"],
      ["a@thread", "b"],
    ]);
    editor._tiptapEditor.destroy();
  });

  it("keeps comments and column widths when moving a column", () => {
    const editor = createEditor();

    drop(editor, "col", 0, 1);

    expect(cells(editor)).toEqual([
      ["b", "a@thread"],
      ["d", "c"],
    ]);
    expect((editor.getBlock("table") as any).content.columnWidths).toEqual([
      200, 100,
    ]);
    editor._tiptapEditor.destroy();
  });
});
