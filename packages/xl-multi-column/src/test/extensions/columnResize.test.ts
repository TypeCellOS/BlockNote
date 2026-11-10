import { getNodeById } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import {
  ColumnState,
  columnResizePluginKey,
} from "../../extensions/ColumnResize/ColumnResizeExtension.js";
import { setupTestEnv } from "../setupTestEnv.js";

const getEditor = setupTestEnv();

// Puts the column resize plugin into the state it would be in when the user
// hovers the boundary between the two columns of "column-list-0" in the test
// document, as the plugin's mouse handlers would.
function hoverColumnBoundary() {
  const editor = getEditor();
  const view = editor._tiptapEditor.view;

  const columnList = getNodeById("column-list-0", view.state.doc);
  const leftColumn = getNodeById("column-0", view.state.doc);
  const rightColumn = getNodeById("column-1", view.state.doc);

  if (!columnList || !leftColumn || !rightColumn) {
    throw new Error("Test document is missing expected columns");
  }

  const hoverState: ColumnState = {
    type: "hover-column",
    columnList: {
      element: document.createElement("div"),
      id: "column-list-0",
      ...columnList,
    },
    leftColumn: {
      element: document.createElement("div"),
      id: "column-0",
      ...leftColumn,
    },
    rightColumn: {
      element: document.createElement("div"),
      id: "column-1",
      ...rightColumn,
    },
  };

  view.dispatch(view.state.tr.setMeta(columnResizePluginKey, hoverState));
}

describe("Column resize plugin state after doc changes", () => {
  it("falls back to default when a hovered column's removal unwraps the column list", () => {
    const editor = getEditor();

    hoverColumnBoundary();

    // Removing one of the two columns brings the column list below its
    // minimum of 2 children, so it gets unwrapped entirely. This used to
    // throw a RangeError from the plugin's decorations, as they were built
    // from positions resolved against the old, larger doc.
    editor.removeBlocks(["column-1"]);

    expect(
      columnResizePluginKey.getState(editor._tiptapEditor.view.state),
    ).toEqual({ type: "default" });
    // The surviving column's two paragraphs are unwrapped to the top level.
    expect(editor.document.map((block) => block.type)).toEqual([
      "paragraph",
      "paragraph",
      "paragraph",
      "paragraph",
      "paragraph",
    ]);
  });

  it("falls back to default when the whole doc is replaced", () => {
    const editor = getEditor();

    hoverColumnBoundary();

    // Mimics select-all + backspace clearing the document while columns are
    // hovered.
    editor.replaceBlocks(editor.document, [{ type: "paragraph" }]);

    expect(
      columnResizePluginKey.getState(editor._tiptapEditor.view.state),
    ).toEqual({ type: "default" });
    expect(editor.document).toHaveLength(1);
  });

  it("keeps the hover state when an unrelated block changes", () => {
    const editor = getEditor();

    hoverColumnBoundary();

    editor.updateBlock("paragraph-1", { content: "Updated Paragraph 1" });

    const pluginState = columnResizePluginKey.getState(
      editor._tiptapEditor.view.state,
    );
    expect(pluginState?.type).toBe("hover-column");
  });
});

describe.each(["hover-column", "resize"] as const)(
  "%s pair validation",
  (mode) => {
    function startPair() {
      hoverColumnBoundary();
      if (mode === "resize") {
        const view = getEditor().prosemirrorView;
        const state = columnResizePluginKey.getState(view.state);
        if (state?.type !== "hover-column") {
          throw new Error("Expected a hovered column pair");
        }
        const resize: ColumnState = {
          ...state,
          type: "resize",
          startPos: 0,
          leftColumn: { ...state.leftColumn, widthPx: 100, widthPercent: 1 },
          rightColumn: { ...state.rightColumn, widthPx: 100, widthPercent: 1 },
        };
        view.dispatch(view.state.tr.setMeta(columnResizePluginKey, resize));
      }
    }

    it.each(["reorder", "separate", "reparent"] as const)(
      "clears the pair after %s",
      (change) => {
        const editor = getEditor();
        startPair();
        const columns = editor.getBlock("column-list-0")!.children;
        const extra = {
          id: "extra-column",
          type: "column" as const,
          children: [{ type: "paragraph" as const, content: "Extra" }],
        };
        if (change === "reorder") {
          editor.updateBlock("column-list-0", {
            children: [columns[1], columns[0]],
          });
        } else if (change === "separate") {
          editor.updateBlock("column-list-0", {
            children: [columns[0], extra, columns[1]],
          });
        } else {
          editor.replaceBlocks(editor.document, [
            {
              type: "columnList",
              id: "column-list-0",
              children: [columns[0], extra],
            },
            {
              type: "columnList",
              id: "other-list",
              children: [
                columns[1],
                { type: "column", children: [{ type: "paragraph" }] },
              ],
            },
          ]);
        }
        expect(columnResizePluginKey.getState(editor.prosemirrorState)).toEqual(
          { type: "default" },
        );
      },
    );

    it("keeps an adjacent pair after an unrelated edit", () => {
      const editor = getEditor();
      startPair();
      editor.updateBlock("paragraph-1", { content: "Changed" });
      expect(
        columnResizePluginKey.getState(editor.prosemirrorState)?.type,
      ).toBe(mode);
    });
  },
);
