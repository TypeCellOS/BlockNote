import { describe, expect, it } from "vitest";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

/**
 * @vitest-environment jsdom
 */

function createEditorWithBlocks(
  blockCount: number,
  blockType: "heading" | "paragraph" = "heading",
) {
  const editor = BlockNoteEditor.create();
  editor.mount(document.createElement("div"));
  const blocks = [];
  for (let i = 0; i < blockCount; i++) {
    blocks.push({
      type: blockType as any,
      content: `Block number ${i} with some text to simulate a real document`,
      ...(blockType === "heading" ? { props: { level: 1 } } : {}),
    });
  }
  editor.replaceBlocks(editor.document, blocks as any);
  return editor;
}

function getPreviousBlockTypePluginState(
  editor: BlockNoteEditor<any, any, any>,
) {
  const view = editor._tiptapEditor.view;
  const plugin = view.state.plugins.find((p) => {
    const key = (p.spec as any)?.key;
    return key && typeof key === "object" && key.key === "previous-blocks$";
  });
  if (!plugin) {
    throw new Error("PreviousBlockType plugin not found");
  }
  return plugin.getState(view.state) as {
    updatedBlocks: Set<string>;
    currentTransactionOldBlockAttrs: Record<string, any>;
    prevTransactionOldBlockAttrs: Record<string, any>;
  };
}

describe("PreviousBlockType: scoped traversal", () => {
  it("only tracks blocks in the changed range, not the entire document", () => {
    const editor = createEditorWithBlocks(500, "heading");
    const view = editor._tiptapEditor.view;

    // Insert a character — block attributes (type, level, depth) don't change
    const pos = view.state.doc.content.size - 4;
    view.dispatch(view.state.tr.insertText("x", pos));

    const state = getPreviousBlockTypePluginState(editor);

    // No blocks should be marked as updated since typing doesn't change attrs
    expect(state.updatedBlocks.size).toBe(0);

    // The plugin should only have tracked the block(s) in the changed range,
    // not all 500 blocks. Before the fix this was 500; after, typically 1-3.
    const trackedBlockCount = Object.keys(
      state.currentTransactionOldBlockAttrs,
    ).length;
    expect(trackedBlockCount).toBeLessThan(10);
  });

  it("correctly detects attribute changes only for affected blocks", () => {
    const editor = createEditorWithBlocks(100, "heading");

    // Change the first block's type from heading to paragraph
    const firstBlock = editor.document[0];
    editor.updateBlock(firstBlock, { type: "paragraph" });

    const state = getPreviousBlockTypePluginState(editor);

    // Only the first block should be marked as updated
    expect(state.updatedBlocks.size).toBe(1);
    expect(state.updatedBlocks.has(firstBlock.id)).toBe(true);

    // Only a small number of blocks tracked (the changed range)
    const trackedBlockCount = Object.keys(
      state.currentTransactionOldBlockAttrs,
    ).length;
    expect(trackedBlockCount).toBeLessThan(10);
  });
});
