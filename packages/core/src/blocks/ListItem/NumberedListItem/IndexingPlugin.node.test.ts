// @vitest-environment node
import { EditorState } from "@tiptap/pm/state";
import { afterEach, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { splitBlockTr } from "../../../api/blockManipulation/commands/splitBlock/splitBlock.js";
import { NumberedListIndexingDecorationPlugin } from "./IndexingPlugin.js";

const editors: BlockNoteEditor[] = [];

afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor._tiptapEditor.destroy();
  }
});

function createState(starts: (number | undefined)[]) {
  const editor = BlockNoteEditor.create();
  editors.push(editor);
  const schema = editor.pmSchema;
  const plugin = NumberedListIndexingDecorationPlugin();
  const doc = schema.nodes.doc.create(
    null,
    schema.nodes.blockGroup.create(
      null,
      starts.map((start, index) =>
        schema.nodes.blockContainer.create(
          { id: String(index) },
          schema.nodes.numberedListItem.create({ start }, schema.text("Item")),
        ),
      ),
    ),
  );
  const state = EditorState.create({ schema, doc, plugins: [plugin] });
  return { state, plugin };
}

it("honors explicit starts and restarts in consecutive numbered blocks", () => {
  const { state, plugin } = createState([
    4,
    undefined,
    1,
    undefined,
    7,
    undefined,
    0,
  ]);
  expect(
    plugin
      .getState(state)!
      .decorations.find()
      .map((decoration) => decoration.spec.index),
  ).toEqual([4, 5, 1, 2, 7, 8, 0]);
});

it("finds an earlier restart when updating a later item without a cached predecessor", () => {
  const { state, plugin } = createState([
    4,
    undefined,
    1,
    undefined,
    undefined,
  ]);
  let lastPosition = 0;
  state.doc.descendants((node, position) => {
    if (node.type.name === "numberedListItem") {
      lastPosition = position;
    }
  });
  const next = state.apply(state.tr.insertText("x", lastPosition + 1));
  expect(
    plugin
      .getState(next)!
      .decorations.find()
      .map((decoration) => decoration.spec.index),
  ).toEqual([4, 5, 1, 2, 3]);
});

it("renumbers following items when an explicit restart changes", () => {
  const { state, plugin } = createState([4, undefined, 1, undefined]);
  let restartPosition = 0;
  state.doc.descendants((node, position) => {
    if (node.type.name === "numberedListItem" && node.attrs.start === 1) {
      restartPosition = position;
    }
  });
  const next = state.apply(
    state.tr.setNodeAttribute(restartPosition, "start", 8),
  );
  expect(
    plugin
      .getState(next)!
      .decorations.find()
      .map((decoration) => decoration.spec.index),
  ).toEqual([4, 5, 8, 9]);
});

it("does not duplicate a numbering restart when splitting with preserved props", () => {
  const { state, plugin } = createState([4, undefined]);
  const tr = state.tr;
  expect(splitBlockTr(tr, 3, true, true)).toBe(true);
  const next = state.apply(tr);
  expect(
    plugin
      .getState(next)!
      .decorations.find()
      .map((decoration) => decoration.spec.index),
  ).toEqual([4, 5, 6]);
});
