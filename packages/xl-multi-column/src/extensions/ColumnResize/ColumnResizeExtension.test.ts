// @vitest-environment node
import { BlockNoteEditor, getNodeById } from "@blocknote/core";
import { EditorState } from "prosemirror-state";
import { expect, test } from "vite-plus/test";

import { createColumnResizePlugin } from "./ColumnResizeExtension.js";
import { testEditorSchema } from "../../test/setupTestEnv.js";

function setup() {
  const editor = BlockNoteEditor.create({
    schema: testEditorSchema,
    disableExtensions: ["sideMenu"],
    initialContent: [
      {
        id: "list",
        type: "columnList",
        children: [
          { id: "left", type: "column", children: [{ content: "Left" }] },
          { id: "right", type: "column", children: [{ content: "Right" }] },
        ],
      },
    ],
  });
  const doc = editor.prosemirrorState.doc;
  const plugin = createColumnResizePlugin(editor);
  const state = EditorState.create({ doc, plugins: [plugin] });
  // Only the node and position are used by the decorations/state callbacks.
  const columnList = { id: "list", ...getNodeById("list", doc)! };
  return { editor, plugin, state, columnList };
}

test("clears column hover decorations when the hovered node is removed", () => {
  const { plugin, state, columnList } = setup();
  const hovered = state.apply(
    state.tr.setMeta(plugin, {
      type: "hover-column-list",
      columnList,
    }),
  );
  const deleted = hovered.apply(hovered.tr.delete(0, hovered.doc.content.size));
  expect(plugin.getState(deleted)).toEqual({ type: "default" });
});

test("refreshes hovered positions and node sizes after document edits", () => {
  const { plugin, state, columnList } = setup();
  const hovered = state.apply(
    state.tr.setMeta(plugin, { type: "hover-column-list", columnList }),
  );
  const prefix = state.schema.nodes.blockContainer.create(
    { id: "prefix" },
    state.schema.nodes.paragraph.create(),
  );
  const edited = hovered.apply(
    hovered.tr
      .insert(1, prefix)
      .insertText(
        "More ",
        getNodeById("left", hovered.doc)!.posBeforeNode + 4 + prefix.nodeSize,
      ),
  );
  expect(plugin.getState(edited)).toEqual({
    type: "hover-column-list",
    columnList: { id: "list", ...getNodeById("list", edited.doc)! },
  });
});

test("keeps resizing and its measured widths during width transactions", () => {
  const { plugin, state, columnList } = setup();
  const leftColumn = {
    id: "left",
    ...getNodeById("left", state.doc)!,
    widthPx: 200,
    widthPercent: 1,
  };
  const rightColumn = {
    id: "right",
    ...getNodeById("right", state.doc)!,
    widthPx: 200,
    widthPercent: 1,
  };
  const resizing = state.apply(
    state.tr.setMeta(plugin, {
      type: "resize",
      startPos: 200,
      columnList,
      leftColumn,
      rightColumn,
    }),
  );
  const resized = resizing.apply(
    resizing.tr.setNodeAttribute(leftColumn.posBeforeNode, "width", 1.2),
  );
  expect(plugin.getState(resized)).toEqual({
    type: "resize",
    startPos: 200,
    columnList: { ...columnList, ...getNodeById("list", resized.doc)! },
    leftColumn: { ...leftColumn, ...getNodeById("left", resized.doc)! },
    rightColumn,
  });
});

test.each(["hover-column", "resize"])(
  "clears %s state when one of the two columns disappears",
  (type) => {
    const { plugin, state, columnList } = setup();
    const leftColumn = { id: "left", ...getNodeById("left", state.doc)! };
    const rightColumn = { id: "right", ...getNodeById("right", state.doc)! };
    const active = state.apply(
      state.tr.setMeta(plugin, { type, columnList, leftColumn, rightColumn }),
    );
    const deleted = active.apply(
      active.tr.delete(
        leftColumn.posBeforeNode,
        leftColumn.posBeforeNode + leftColumn.node.nodeSize,
      ),
    );
    expect(plugin.getState(deleted)).toEqual({ type: "default" });
  },
);
