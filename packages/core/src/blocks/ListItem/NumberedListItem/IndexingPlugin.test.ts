import { Selection } from "prosemirror-state";
import { describe, expect, it } from "vitest";

import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";

/**
 * @vitest-environment jsdom
 */

const PLUGIN_KEY = "numbered-list-indexing-decorations$";

function createEditor() {
  const editor = BlockNoteEditor.create();
  editor.mount(document.createElement("div"));
  return editor;
}

function getDecorationSet(editor: BlockNoteEditor<any, any, any>) {
  const view = editor._tiptapEditor.view;
  const plugin = view.state.plugins.find(
    (p) => (p as any).key === PLUGIN_KEY,
  );
  if (!plugin) {
    throw new Error("IndexingPlugin not found");
  }
  return plugin.getState(view.state)!.decorations;
}

/** Returns all decoration specs in document order. */
function getDecoSpecs(editor: BlockNoteEditor<any, any, any>) {
  const decoSet = getDecorationSet(editor);
  const doc = editor._tiptapEditor.view.state.doc;
  const decos = decoSet.find(0, doc.nodeSize - 2);
  return decos.map((d: any) => d.spec);
}

/** Returns the data-index values from decoration attrs in document order. */
function getDataIndices(editor: BlockNoteEditor<any, any, any>) {
  const decoSet = getDecorationSet(editor);
  const doc = editor._tiptapEditor.view.state.doc;
  const decos = decoSet.find(0, doc.nodeSize - 2);
  return decos.map((d: any) => {
    // Decoration attrs are stored on the decoration object
    const attrs =
      (d as any).type?.attrs ?? (d as any).attrs ?? (d as any).type;
    return parseInt(attrs["data-index"], 10);
  });
}

function setBlocks(
  editor: BlockNoteEditor<any, any, any>,
  blocks: Array<{ type: string; content?: string; props?: any }>,
) {
  editor.replaceBlocks(
    editor.document,
    blocks.map((b) => ({
      type: b.type as any,
      content: b.content ?? "text",
      ...(b.props ? { props: b.props } : {}),
    })) as any,
  );
}

describe("IndexingPlugin: basic numbering", () => {
  it("assigns sequential indices to a contiguous numbered list", () => {
    const editor = createEditor();
    setBlocks(editor, [
      { type: "numberedListItem", content: "a" },
      { type: "numberedListItem", content: "b" },
      { type: "numberedListItem", content: "c" },
    ]);

    const indices = getDataIndices(editor);
    expect(indices).toEqual([1, 2, 3]);
  });

  it("resets index after a non-list block", () => {
    const editor = createEditor();
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

  it("single numbered list item gets index 1", () => {
    const editor = createEditor();
    setBlocks(editor, [{ type: "numberedListItem", content: "only" }]);

    const indices = getDataIndices(editor);
    expect(indices).toEqual([1]);
  });

  it("no decorations for non-list blocks", () => {
    const editor = createEditor();
    setBlocks(editor, [
      { type: "paragraph", content: "a" },
      { type: "heading", content: "b", props: { level: 1 } },
    ]);

    const indices = getDataIndices(editor);
    expect(indices).toEqual([]);
  });
});

describe("IndexingPlugin: updates on structural changes", () => {
  it("updates indices when a block is deleted from the middle", () => {
    const editor = createEditor();
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

  it("updates indices when a block is inserted in the middle", () => {
    const editor = createEditor();
    setBlocks(editor, [
      { type: "numberedListItem", content: "a" },
      { type: "numberedListItem", content: "c" },
    ]);

    // Insert a block after the first
    const firstBlock = editor.document[0];
    editor.insertBlocks(
      [{ type: "numberedListItem" as any, content: "b" } as any],
      firstBlock,
      "after",
    );

    const indices = getDataIndices(editor);
    expect(indices).toEqual([1, 2, 3]);
  });

  it("updates indices when first block is deleted", () => {
    const editor = createEditor();
    setBlocks(editor, [
      { type: "numberedListItem", content: "a" },
      { type: "numberedListItem", content: "b" },
      { type: "numberedListItem", content: "c" },
    ]);

    editor.removeBlocks([editor.document[0]]);

    const indices = getDataIndices(editor);
    expect(indices).toEqual([1, 2]);
  });

  it("updates indices with nested list when first block is deleted", () => {
    const editor = createEditor();
    editor.replaceBlocks(editor.document, [
      {
        type: "numberedListItem" as any,
        content: "first item",
      },
      {
        type: "numberedListItem" as any,
        content: "second item",
        children: [
          { type: "numberedListItem" as any, content: "nested item" },
          { type: "numberedListItem" as any, content: "second nested item" },
        ],
      },
      {
        type: "numberedListItem" as any,
        content: "third item",
      },
    ] as any);

    // Before deletion: top-level [1, 2, 3], nested [1, 2]
    const indicesBefore = getDataIndices(editor);
    expect(indicesBefore).toEqual([1, 2, 1, 2, 3]);

    // Delete first item
    editor.removeBlocks([editor.document[0]]);

    // After deletion: top-level [1, 2], nested [1, 2]
    const indicesAfter = getDataIndices(editor);
    expect(indicesAfter).toEqual([1, 1, 2, 2]);
  });

  it("updates indices when block type changes from numbered list to paragraph", () => {
    const editor = createEditor();
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

  it("updates indices when block type changes from paragraph to numbered list", () => {
    const editor = createEditor();
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
  it("indices unchanged after typing in the first block", () => {
    const editor = createEditor();
    setBlocks(editor, [
      { type: "numberedListItem", content: "a" },
      { type: "numberedListItem", content: "b" },
      { type: "numberedListItem", content: "c" },
    ]);

    const indicesBefore = getDataIndices(editor);

    // Type a character in the first block
    const view = editor._tiptapEditor.view;
    view.dispatch(view.state.tr.insertText("x", 4));

    const indicesAfter = getDataIndices(editor);
    expect(indicesAfter).toEqual(indicesBefore);
  });

  it("indices unchanged after typing in the last block", () => {
    const editor = createEditor();
    setBlocks(editor, [
      { type: "numberedListItem", content: "a" },
      { type: "numberedListItem", content: "b" },
      { type: "numberedListItem", content: "c" },
    ]);

    const indicesBefore = getDataIndices(editor);

    const view = editor._tiptapEditor.view;
    const pos = view.state.doc.content.size - 4;
    view.dispatch(view.state.tr.insertText("x", pos));

    const indicesAfter = getDataIndices(editor);
    expect(indicesAfter).toEqual(indicesBefore);
  });

  it("indices unchanged after typing in a middle block", () => {
    const editor = createEditor();
    setBlocks(editor, [
      { type: "numberedListItem", content: "a" },
      { type: "numberedListItem", content: "b" },
      { type: "numberedListItem", content: "c" },
    ]);

    const indicesBefore = getDataIndices(editor);

    // Find position inside second block's content
    const view = editor._tiptapEditor.view;
    let targetPos = 0;
    view.state.doc.descendants((node, pos) => {
      if (
        node.type.name === "numberedListItem" &&
        targetPos === 0 &&
        pos > 4
      ) {
        targetPos = pos + 1; // inside the inline content
      }
    });
    view.dispatch(view.state.tr.insertText("x", targetPos));

    const indicesAfter = getDataIndices(editor);
    expect(indicesAfter).toEqual(indicesBefore);
  });
});

describe("IndexingPlugin: decoration specs", () => {
  it("decorations have correct spec with index, isFirst, hasStart", () => {
    const editor = createEditor();
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

  it("first item after a paragraph is marked as isFirst", () => {
    const editor = createEditor();
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
  it("does not recompute decorations on selection change", () => {
    const editor = createEditor();
    setBlocks(editor, [
      { type: "numberedListItem", content: "a" },
      { type: "numberedListItem", content: "b" },
    ]);

    const decosBefore = getDecorationSet(editor);

    // Move selection without changing content
    const view = editor._tiptapEditor.view;
    const tr = view.state.tr.setSelection(
      Selection.near(view.state.doc.resolve(4)),
    );
    view.dispatch(tr);

    const decosAfter = getDecorationSet(editor);
    // Same DecorationSet reference — not recomputed
    expect(decosAfter).toBe(decosBefore);
  });
});
