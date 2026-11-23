import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { describe, expect } from "vite-plus/test";

import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { installHeadlessPlugins } from "../../../extensions/testHeadlessEditor.js";
import type { PartialBlock } from "../../defaultBlocks.js";

const it = globalThis.it.extend<{ editor: BlockNoteEditor }>({
  editor: async ({ setupEditor }, use) => {
    const { editor } = await setupEditor();
    installHeadlessPlugins(editor);
    await use(editor);
  },
});

function getDecorationSet(editor: BlockNoteEditor) {
  const state = editor.prosemirrorView.state;
  const extension = editor.getExtension("numbered-list-item-shortcuts");
  for (const plugin of extension?.prosemirrorPlugins ?? []) {
    if (state.plugins.includes(plugin)) {
      const decorations = plugin.props.decorations?.call(plugin, state);
      if (decorations instanceof DecorationSet) {
        return decorations;
      }
    }
  }
  throw new Error("Numbered-list indexing plugin is not installed");
}

/** Returns all decoration specs in document order. */
function getDecoSpecs(editor: BlockNoteEditor) {
  return getDecorationSet(editor)
    .find()
    .map((decoration) => decoration.spec);
}

/** Returns the data-index values from decoration attrs in document order. */
function getDataIndices(editor: BlockNoteEditor) {
  return getDecorationSet(editor)
    .find()
    .map((decoration) => {
      const { from, to, spec } = decoration;
      const index: unknown = spec.index;
      if (typeof index !== "number") {
        throw new Error("List decoration is missing its numeric index");
      }
      expect(decoration).toStrictEqual(
        Decoration.node(from, to, { "data-index": String(index) }, spec),
      );
      return index;
    });
}

function setBlocks(editor: BlockNoteEditor, blocks: PartialBlock[]) {
  editor.replaceBlocks(editor.document, blocks);
}

describe("IndexingPlugin: basic numbering", () => {
  it("assigns sequential indices to a contiguous numbered list", ({
    editor,
  }) => {
    setBlocks(editor, [
      { type: "numberedListItem", content: "a" },
      { type: "numberedListItem", content: "b" },
      { type: "numberedListItem", content: "c" },
    ]);

    const indices = getDataIndices(editor);
    expect(indices).toEqual([1, 2, 3]);
  });

  it("resets index after a non-list block", ({ editor }) => {
    setBlocks(editor, [
      { type: "numberedListItem", content: "a" },
      { type: "numberedListItem", content: "b" },
      { type: "paragraph", content: "break" },
      { type: "numberedListItem", content: "c" },
      { type: "numberedListItem", content: "d" },
    ]);

    const indices = getDataIndices(editor);
    expect(indices).toEqual([1, 2, 1, 2]);
  });

  it("single numbered list item gets index 1", ({ editor }) => {
    setBlocks(editor, [{ type: "numberedListItem", content: "only" }]);

    const indices = getDataIndices(editor);
    expect(indices).toEqual([1]);
  });

  it("no decorations for non-list blocks", ({ editor }) => {
    setBlocks(editor, [
      { type: "paragraph", content: "a" },
      { type: "heading", content: "b", props: { level: 1 } },
    ]);

    const indices = getDataIndices(editor);
    expect(indices).toEqual([]);
  });
});

describe("IndexingPlugin: updates on structural changes", () => {
  it("updates indices when a block is deleted from the middle", ({
    editor,
  }) => {
    setBlocks(editor, [
      { type: "numberedListItem", content: "a" },
      { type: "numberedListItem", content: "b" },
      { type: "numberedListItem", content: "c" },
    ]);

    // Delete the second block
    const secondBlock = editor.document[1];
    editor.removeBlocks([secondBlock]);

    const indices = getDataIndices(editor);
    expect(indices).toEqual([1, 2]);
  });

  it("updates indices when a block is inserted in the middle", ({ editor }) => {
    setBlocks(editor, [
      { type: "numberedListItem", content: "a" },
      { type: "numberedListItem", content: "c" },
    ]);

    // Insert a block after the first
    const firstBlock = editor.document[0];
    editor.insertBlocks(
      [{ type: "numberedListItem", content: "b" }],
      firstBlock,
      "after",
    );

    const indices = getDataIndices(editor);
    expect(indices).toEqual([1, 2, 3]);
  });

  it("updates indices when first block is deleted", ({ editor }) => {
    setBlocks(editor, [
      { type: "numberedListItem", content: "a" },
      { type: "numberedListItem", content: "b" },
      { type: "numberedListItem", content: "c" },
    ]);

    editor.removeBlocks([editor.document[0]]);

    const indices = getDataIndices(editor);
    expect(indices).toEqual([1, 2]);
  });

  it("updates indices with nested list when first block is deleted", ({
    editor,
  }) => {
    editor.replaceBlocks(editor.document, [
      {
        type: "numberedListItem",
        content: "first item",
      },
      {
        type: "numberedListItem",
        content: "second item",
        children: [
          { type: "numberedListItem", content: "nested item" },
          { type: "numberedListItem", content: "second nested item" },
        ],
      },
      {
        type: "numberedListItem",
        content: "third item",
      },
    ]);

    // Before deletion: top-level [1, 2, 3], nested [1, 2]
    const indicesBefore = getDataIndices(editor);
    expect(indicesBefore).toEqual([1, 2, 1, 2, 3]);

    // Delete first item
    editor.removeBlocks([editor.document[0]]);

    // After deletion: top-level [1, 2], nested [1, 2]
    const indicesAfter = getDataIndices(editor);
    expect(indicesAfter).toEqual([1, 1, 2, 2]);
  });

  it("updates indices when block type changes from numbered list to paragraph", ({
    editor,
  }) => {
    setBlocks(editor, [
      { type: "numberedListItem", content: "a" },
      { type: "numberedListItem", content: "b" },
      { type: "numberedListItem", content: "c" },
    ]);

    // Change second block to paragraph — splits the list
    editor.updateBlock(editor.document[1], { type: "paragraph" });

    const indices = getDataIndices(editor);
    // First list: [1], then paragraph (no decoration), then new list: [1]
    expect(indices).toEqual([1, 1]);
  });

  it("updates indices when block type changes from paragraph to numbered list", ({
    editor,
  }) => {
    setBlocks(editor, [
      { type: "numberedListItem", content: "a" },
      { type: "paragraph", content: "b" },
      { type: "numberedListItem", content: "c" },
    ]);

    // Change paragraph to numbered list — merges the lists
    editor.updateBlock(editor.document[1], { type: "numberedListItem" });

    const indices = getDataIndices(editor);
    expect(indices).toEqual([1, 2, 3]);
  });
});

describe("IndexingPlugin: typing preserves indices (early exit)", () => {
  it("indices unchanged after typing in the first block", ({ editor }) => {
    setBlocks(editor, [
      { type: "numberedListItem", content: "a" },
      { type: "numberedListItem", content: "b" },
      { type: "numberedListItem", content: "c" },
    ]);

    const indicesBefore = getDataIndices(editor);

    // Type a character in the first block
    editor.setTextCursorPosition(editor.document[0], "end");
    editor.insertInlineContent("x");

    const indicesAfter = getDataIndices(editor);
    expect(indicesAfter).toEqual(indicesBefore);
  });

  it("indices unchanged after typing in the last block", ({ editor }) => {
    setBlocks(editor, [
      { type: "numberedListItem", content: "a" },
      { type: "numberedListItem", content: "b" },
      { type: "numberedListItem", content: "c" },
    ]);

    const indicesBefore = getDataIndices(editor);

    editor.setTextCursorPosition(editor.document.at(-1)!, "start");
    editor.insertInlineContent("x");

    const indicesAfter = getDataIndices(editor);
    expect(indicesAfter).toEqual(indicesBefore);
  });

  it("indices unchanged after typing in a middle block", ({ editor }) => {
    setBlocks(editor, [
      { type: "numberedListItem", content: "a" },
      { type: "numberedListItem", content: "b" },
      { type: "numberedListItem", content: "c" },
    ]);

    const indicesBefore = getDataIndices(editor);

    // Find position inside second block's content
    editor.setTextCursorPosition(editor.document[1], "start");
    editor.insertInlineContent("x");

    const indicesAfter = getDataIndices(editor);
    expect(indicesAfter).toEqual(indicesBefore);
  });
});

describe("IndexingPlugin: decoration specs", () => {
  it("decorations have correct spec with index, isFirst, hasStart", ({
    editor,
  }) => {
    setBlocks(editor, [
      { type: "numberedListItem", content: "a" },
      { type: "numberedListItem", content: "b" },
    ]);

    const specs = getDecoSpecs(editor);
    expect(specs).toEqual([
      { index: 1, isFirst: true, hasStart: false },
      { index: 2, isFirst: false, hasStart: false },
    ]);
  });

  it("first item after a paragraph is marked as isFirst", ({ editor }) => {
    setBlocks(editor, [
      { type: "numberedListItem", content: "a" },
      { type: "paragraph", content: "break" },
      { type: "numberedListItem", content: "b" },
      { type: "numberedListItem", content: "c" },
    ]);

    const specs = getDecoSpecs(editor);
    expect(specs).toEqual([
      { index: 1, isFirst: true, hasStart: false },
      { index: 1, isFirst: true, hasStart: false },
      { index: 2, isFirst: false, hasStart: false },
    ]);
  });
});

describe("IndexingPlugin: selection-only transactions", () => {
  it("does not recompute decorations on selection change", ({ editor }) => {
    setBlocks(editor, [
      { type: "numberedListItem", content: "a" },
      { type: "numberedListItem", content: "b" },
    ]);

    const decosBefore = getDecorationSet(editor);

    // Move selection without changing content
    editor.setTextCursorPosition(editor.document[0], "end");

    const decosAfter = getDecorationSet(editor);
    // Same DecorationSet reference — not recomputed
    expect(decosAfter).toBe(decosBefore);
  });
});
