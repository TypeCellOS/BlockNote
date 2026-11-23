import type { BlockNoteEditor as MountedEditor } from "@blocknote/core";
import { Plugin } from "prosemirror-state";
import { describe, expect } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { createExtension } from "../../editor/BlockNoteExtension.js";

function getPreviousBlockTypePluginState(editor: {
  prosemirrorView: MountedEditor["prosemirrorView"];
}) {
  const view = editor.prosemirrorView;
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
  const it = globalThis.it.extend<{
    createEditorWithBlocks: (blockCount: number) => Promise<MountedEditor>;
  }>({
    createEditorWithBlocks: async ({ setupEditor }, use) => {
      await use(async (blockCount) => {
        const { editor } = await setupEditor({ mountType: "dom" });
        editor.replaceBlocks(
          editor.document,
          Array.from({ length: blockCount }, (_, i) => ({
            type: "heading",
            content: `Block number ${i} with some text to simulate a real document`,
            props: { level: 1 },
          })),
        );
        return editor;
      });
    },
  });

  it("only tracks blocks in the changed range, not the entire document", async ({
    createEditorWithBlocks,
  }) => {
    const editor = await createEditorWithBlocks(500);
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

  it("correctly detects attribute changes only for affected blocks", async ({
    createEditorWithBlocks,
  }) => {
    const editor = await createEditorWithBlocks(100);

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

  it("detects attribute-only changes (heading level) that emit an AttrStep", async ({
    createEditorWithBlocks,
  }) => {
    const editor = await createEditorWithBlocks(100);

    // Changing only a heading's level (type stays "heading") emits an AttrStep,
    // whose StepMap is empty — so ProseMirror's changedRange() returns null and
    // the change would be missed unless the scoped range also covers AttrSteps.
    const firstBlock = editor.document[0];
    editor.updateBlock(firstBlock, { props: { level: 2 } } as any);

    const state = getPreviousBlockTypePluginState(editor);

    expect(state.updatedBlocks.size).toBe(1);
    expect(state.updatedBlocks.has(firstBlock.id)).toBe(true);

    // Still scoped to the changed range, not all 100 blocks.
    const trackedBlockCount = Object.keys(
      state.currentTransactionOldBlockAttrs,
    ).length;
    expect(trackedBlockCount).toBeLessThan(10);
  });
});

// https://github.com/TypeCellOS/BlockNote/issues/3013
describe("PreviousBlockType: changes before the view exists", () => {
  it("doesn't mark a block whose type changed while the view was created", ({
    onTestFinished,
  }) => {
    // Like y-sync's first render: an earlier plugin view replaces the
    // placeholder paragraph with a stored heading that has the same id.
    const RenderOnCreate = createExtension(({ editor }) => ({
      key: "renderOnCreate",
      runsBefore: ["previousBlockType"],
      prosemirrorPlugins: [
        new Plugin({
          view: () => {
            editor.updateBlock(editor.document[0], {
              type: "heading",
              props: { level: 1 },
            });
            return {};
          },
        }),
      ],
    }));
    const editor = BlockNoteEditor.create({
      initialContent: [{ type: "paragraph", content: "Title" }],
      extensions: [RenderOnCreate()],
    });
    editor.mount(document.createElement("div"));
    onTestFinished(() => editor.unmount());

    expect(editor.document[0].type).toBe("heading");
    expect(getPreviousBlockTypePluginState(editor).updatedBlocks.size).toBe(0);
    expect(editor.domElement!.querySelector("[data-prev-type]")).toBeNull();
  });
});
