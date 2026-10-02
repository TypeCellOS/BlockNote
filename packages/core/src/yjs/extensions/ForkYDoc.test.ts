import { afterEach, describe, expect, it } from "vite-plus/test";
import { trackPosition } from "../../api/positionMapping.js";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { ySyncPluginKey, yUndoPluginKey } from "y-prosemirror";
import { BlockNoteEditor } from "../../index.js";
import { ForkYDocExtension } from "./ForkYDoc.js";
import { withCollaboration } from "./index.js";

/**
 * @vitest-environment jsdom
 */

function createCollabEditor() {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment("doc");
  const awareness = new Awareness(doc);
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment,
        user: { name: "Test User", color: "#FF0000" },
        provider: { awareness },
      },
    }),
  );
  const div = document.createElement("div");
  editor.mount(div);
  return { editor, doc, fragment, awareness };
}

function getEditorText(editor: BlockNoteEditor) {
  return editor.prosemirrorState.doc.textContent;
}

function setEditorText(editor: BlockNoteEditor, text: string) {
  editor.replaceBlocks(editor.document, [
    {
      type: "paragraph",
      content: [{ text, styles: {}, type: "text" }],
    },
  ]);
}

let ctx: ReturnType<typeof createCollabEditor>;

afterEach(() => {
  ctx?.editor.unmount();
  ctx?.awareness.destroy();
  ctx?.doc.destroy();
});

describe("ForkYDocExtension", () => {
  it("forks the document — edits do not affect the original fragment", () => {
    ctx = createCollabEditor();
    setEditorText(ctx.editor, "Original");

    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;
    forkYDoc.fork();

    // Edit while forked
    setEditorText(ctx.editor, "Forked edit");

    // The original fragment should still have the original content
    expect(ctx.fragment.toJSON()).toContain("Original");
    expect(getEditorText(ctx.editor)).toBe("Forked edit");
  });

  it("merge({ keepChanges: false }) discards forked edits", () => {
    ctx = createCollabEditor();
    setEditorText(ctx.editor, "Original");

    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;
    forkYDoc.fork();
    setEditorText(ctx.editor, "Forked edit");

    forkYDoc.merge({ keepChanges: false });

    expect(getEditorText(ctx.editor)).toBe("Original");
  });

  it("merge({ keepChanges: true }) applies forked edits to the original doc", () => {
    ctx = createCollabEditor();
    setEditorText(ctx.editor, "Original");

    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;
    forkYDoc.fork();
    setEditorText(ctx.editor, "Forked edit");

    forkYDoc.merge({ keepChanges: true });

    // The editor and original fragment should both reflect the forked edit
    expect(getEditorText(ctx.editor)).toContain("Forked edit");
  });

  // https://github.com/TypeCellOS/BlockNote/issues/3135
  it.each([false, true])(
    "merge({ keepChanges: %s }) restores remote cursors without splitting the sync binding",
    (keepChanges) => {
      ctx = createCollabEditor();
      ctx.editor.replaceBlocks(ctx.editor.document, [
        { type: "paragraph", content: "one" },
        { type: "paragraph", content: "two" },
      ]);

      const cursor = Y.relativePositionToJSON(
        Y.createRelativePositionFromTypeIndex(
          ctx.fragment,
          ctx.fragment.length,
        ),
      );
      // The provider's awareness map can receive a remote state without a network connection.
      ctx.awareness.getStates().set(424242, {
        user: { name: "Remote", color: "#00FF00" },
        cursor: { anchor: cursor, head: cursor },
      });

      const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;
      forkYDoc.fork();
      setEditorText(ctx.editor, "Forked edit");
      expect(() => forkYDoc.merge({ keepChanges })).not.toThrow();
      expect(forkYDoc.store.state.isForked).toBe(false);
      expect(getEditorText(ctx.editor)).toBe(
        keepChanges ? "Forked edit" : "onetwo",
      );
      const sync = ySyncPluginKey.getState(ctx.editor.prosemirrorState);
      expect(sync.type).toBe(ctx.fragment);
      expect(sync.doc).toBe(ctx.doc);
      expect(sync.binding.type).toBe(ctx.fragment);
      expect(
        ctx.editor.domElement?.querySelector(".bn-collaboration-cursor__base"),
      ).not.toBeNull();
    },
  );

  it("keeps fork undo separate from the original undo and redo history", () => {
    ctx = createCollabEditor();
    setEditorText(ctx.editor, "First");
    yUndoPluginKey
      .getState(ctx.editor.prosemirrorState)!
      .undoManager.stopCapturing();
    setEditorText(ctx.editor, "Second");
    expect(ctx.editor.undo()).toBe(true);
    expect(getEditorText(ctx.editor)).toBe("First");

    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;
    forkYDoc.fork();
    setEditorText(ctx.editor, "Forked");
    expect(ctx.editor.undo()).toBe(true);
    expect(getEditorText(ctx.editor)).toBe("First");
    expect(ctx.fragment.toJSON()).toContain("First");
    forkYDoc.merge({ keepChanges: false });

    expect(ctx.editor.redo()).toBe(true);
    expect(getEditorText(ctx.editor)).toBe("Second");
  });

  it("fork({ initialUpdate }) uses the provided update instead of the live doc", () => {
    ctx = createCollabEditor();
    setEditorText(ctx.editor, "Current content");

    // Create a snapshot of an earlier state
    const snapshotDoc = new Y.Doc();
    // Manually build content in the snapshot doc
    Y.applyUpdate(snapshotDoc, Y.encodeStateAsUpdate(ctx.doc));
    // Now modify the live editor
    setEditorText(ctx.editor, "Modified after snapshot");

    // Fork with the snapshot (which has "Current content", not "Modified after snapshot")
    const snapshotUpdate = Y.encodeStateAsUpdate(snapshotDoc);
    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;
    forkYDoc.fork({ initialUpdate: snapshotUpdate });

    // The editor should show the snapshot content, not the current live content
    expect(getEditorText(ctx.editor)).toBe("Current content");

    // The original fragment should still have the modified content
    expect(ctx.fragment.toJSON()).toContain("Modified after snapshot");
  });

  it("fork({ initialUpdate }) + merge({ keepChanges: false }) restores live doc", () => {
    ctx = createCollabEditor();
    setEditorText(ctx.editor, "Live content");

    // Create a snapshot update
    const snapshotDoc = new Y.Doc();
    Y.applyUpdate(snapshotDoc, Y.encodeStateAsUpdate(ctx.doc));

    setEditorText(ctx.editor, "Updated live content");

    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;
    forkYDoc.fork({ initialUpdate: Y.encodeStateAsUpdate(snapshotDoc) });

    // Editor shows snapshot
    expect(getEditorText(ctx.editor)).toBe("Live content");

    // Merge without keeping changes
    forkYDoc.merge({ keepChanges: false });

    // Should be back to the live doc
    expect(getEditorText(ctx.editor)).toBe("Updated live content");
  });

  it("calling fork() while already forked is a no-op", () => {
    ctx = createCollabEditor();
    setEditorText(ctx.editor, "Original");

    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;
    forkYDoc.fork();
    setEditorText(ctx.editor, "Forked edit");

    // Second fork should be a no-op
    forkYDoc.fork();
    expect(getEditorText(ctx.editor)).toBe("Forked edit");
  });

  it("isForked store state reflects fork/merge lifecycle", () => {
    ctx = createCollabEditor();
    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;

    expect(forkYDoc.store.state.isForked).toBe(false);

    forkYDoc.fork();
    expect(forkYDoc.store.state.isForked).toBe(true);

    forkYDoc.merge({ keepChanges: false });
    expect(forkYDoc.store.state.isForked).toBe(false);
  });

  it("merge() is a no-op when not forked", () => {
    ctx = createCollabEditor();
    setEditorText(ctx.editor, "Untouched");

    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;

    // Should not throw or change anything.
    forkYDoc.merge({ keepChanges: false });
    forkYDoc.merge({ keepChanges: true });

    expect(getEditorText(ctx.editor)).toBe("Untouched");
    expect(forkYDoc.store.state.isForked).toBe(false);
  });

  it("forked doc is isolated from the original Y.Doc", () => {
    ctx = createCollabEditor();
    setEditorText(ctx.editor, "Before fork");

    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;
    forkYDoc.fork();

    // Edit while forked
    setEditorText(ctx.editor, "Forked edit");

    // The original fragment should still have "Before fork"
    expect(ctx.fragment.toJSON()).toContain("Before fork");
    expect(ctx.fragment.toJSON()).not.toContain("Forked edit");
  });

  it("fork({ initialUpdate }) + merge({ keepChanges: true }) applies forked edits to original", () => {
    ctx = createCollabEditor();
    setEditorText(ctx.editor, "Current content");

    // Take a snapshot
    const snapshotDoc = new Y.Doc();
    Y.applyUpdate(snapshotDoc, Y.encodeStateAsUpdate(ctx.doc));

    // Move the live doc forward
    setEditorText(ctx.editor, "Live content");

    // Fork from the snapshot
    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;
    forkYDoc.fork({ initialUpdate: Y.encodeStateAsUpdate(snapshotDoc) });
    expect(getEditorText(ctx.editor)).toBe("Current content");

    // Edit while forked
    setEditorText(ctx.editor, "Forked modification");

    // Merge and keep changes
    forkYDoc.merge({ keepChanges: true });
    expect(getEditorText(ctx.editor)).toContain("Forked modification");
  });

  // https://github.com/TypeCellOS/BlockNote/issues/2946
  it("can track positions while forked", () => {
    ctx = createCollabEditor();
    setEditorText(ctx.editor, "Hello World");

    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;
    forkYDoc.fork();

    // Store position at "Hello| World"
    const getCursorPos = trackPosition(ctx.editor, 8);
    expect(getCursorPos()).toBe(8);

    // Insert text at the beginning of "|Hello World"
    ctx.editor._tiptapEditor.commands.insertContentAt(3, "Test ");
    expect(getCursorPos()).toBe(13);
  });

  // https://github.com/TypeCellOS/BlockNote/issues/2946
  it("can track positions across fork and merge", () => {
    ctx = createCollabEditor();
    setEditorText(ctx.editor, "Hello World");

    // Store position at "Hello| World"
    const getCursorPos = trackPosition(ctx.editor, 8);

    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;
    forkYDoc.fork();
    expect(getCursorPos()).toBe(8);

    ctx.editor._tiptapEditor.commands.insertContentAt(3, "Test ");
    expect(getCursorPos()).toBe(13);

    forkYDoc.merge({ keepChanges: true });
    expect(getCursorPos()).toBe(13);
  });
});
