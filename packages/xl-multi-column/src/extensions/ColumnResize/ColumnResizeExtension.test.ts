import { getNodeById } from "@blocknote/core";
import { EditorState } from "prosemirror-state";
import { expect } from "vite-plus/test";

import type { SetupEditor } from "../../../../../tests/src/commands/node/setupEditor.js";
import { createColumnResizePlugin } from "./ColumnResizeExtension.js";
import { testEditorSchema } from "../../test/setupTestEnv.js";

async function setup(setupEditor: SetupEditor) {
  const { editor } = await setupEditor({
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
  // The plugin's state transition is the unit under test: mount-free
  // ProseMirror transactions here, actual pointer events in the browser suite.
  const doc = editor.transact(({ doc }) => doc);
  const plugin = createColumnResizePlugin(editor);
  const state = EditorState.create({ doc, plugins: [plugin] });
  // Only the node and position are used by the decorations/state callbacks.
  const columnList = { id: "list", ...getNodeById("list", doc)! };
  return { editor, plugin, state, columnList };
}

it("clears column hover decorations when the hovered node is removed", async ({
  setupEditor,
}) => {
  const { plugin, state, columnList } = await setup(setupEditor);
  const hovered = state.apply(
    state.tr.setMeta(plugin, {
      type: "hover-column-list",
      columnList,
    }),
  );
  const deleted = hovered.apply(hovered.tr.delete(0, hovered.doc.content.size));
  expect(plugin.getState(deleted)).toEqual({ type: "default" });
});

it("refreshes hovered positions and node sizes after document edits", async ({
  setupEditor,
}) => {
  const { plugin, state, columnList } = await setup(setupEditor);
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

it("keeps resizing and its measured widths during width transactions", async ({
  setupEditor,
}) => {
  const { plugin, state, columnList } = await setup(setupEditor);
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

it.for(["hover-column", "resize"])(
  "clears %s state when one of the two columns disappears",
  async (type, { setupEditor }) => {
    const { plugin, state, columnList } = await setup(setupEditor);
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
