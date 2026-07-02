/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vite-plus/test";
import * as Y from "@y/y";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { ForkYDocExtension } from "./ForkYDoc.js";
import { withCollaboration } from "./index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createCollabEditor() {
  const doc = new Y.Doc();
  const fragment = doc.get("doc");

  const collabOptions = {
    fragment,
    user: { name: "Test User", color: "#FF0000" },
    provider: undefined,
  };

  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: collabOptions,
      // Register ForkYDocExtension alongside the collaboration extensions
      extensions: [ForkYDocExtension(collabOptions)],
    }),
  );
  const div = document.createElement("div");
  editor.mount(div);

  return { editor, doc, fragment };
}

function getEditorText(editor: BlockNoteEditor): string {
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

let ctx: ReturnType<typeof createCollabEditor>;

afterEach(() => {
  ctx?.editor.unmount();
  ctx?.doc.destroy();
});

describe("ForkYDocExtension (v14)", () => {
  it("forks the document — edits do not affect the original fragment", () => {
    ctx = createCollabEditor();
    setEditorText(ctx.editor, "Original");

    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;
    forkYDoc.fork();

    // Edit while forked
    setEditorText(ctx.editor, "Forked edit");

    // The editor shows the forked content
    expect(getEditorText(ctx.editor)).toBe("Forked edit");

    // Merge without keeping changes to verify the original is intact
    forkYDoc.merge({ keepChanges: false });
    expect(getEditorText(ctx.editor)).toBe("Original");
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

    expect(getEditorText(ctx.editor)).toContain("Forked edit");
  });

  it("fork({ initialUpdate }) uses the provided update instead of the live doc", () => {
    ctx = createCollabEditor();
    setEditorText(ctx.editor, "Current content");

    // Create a snapshot of the current state
    const snapshotDoc = new Y.Doc();
    Y.applyUpdateV2(snapshotDoc, Y.encodeStateAsUpdateV2(ctx.doc));

    // Modify the live editor
    setEditorText(ctx.editor, "Modified after snapshot");

    // Fork with the snapshot (which has "Current content")
    const snapshotUpdate = Y.encodeStateAsUpdateV2(snapshotDoc);
    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;
    forkYDoc.fork({ initialUpdate: snapshotUpdate });

    // The editor should show the snapshot content
    expect(getEditorText(ctx.editor)).toBe("Current content");

    // Merge without keeping changes to verify the live doc is still "Modified after snapshot"
    forkYDoc.merge({ keepChanges: false });
    expect(getEditorText(ctx.editor)).toBe("Modified after snapshot");
  });

  it("fork({ initialUpdate }) + merge({ keepChanges: false }) restores live doc", () => {
    ctx = createCollabEditor();
    setEditorText(ctx.editor, "Live content");

    const snapshotDoc = new Y.Doc();
    Y.applyUpdateV2(snapshotDoc, Y.encodeStateAsUpdateV2(ctx.doc));

    setEditorText(ctx.editor, "Updated live content");

    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;
    forkYDoc.fork({
      initialUpdate: Y.encodeStateAsUpdateV2(snapshotDoc),
    });

    expect(getEditorText(ctx.editor)).toBe("Live content");

    forkYDoc.merge({ keepChanges: false });

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

  it("forked doc is a separate Y.Doc from the original", () => {
    ctx = createCollabEditor();
    setEditorText(ctx.editor, "Before fork");

    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;
    forkYDoc.fork();

    // Edit while forked
    setEditorText(ctx.editor, "Forked edit");

    // The original Y.Doc should not see the forked edit.
    // Verify by creating a second editor pointing at the same original doc.
    const secondDoc = new Y.Doc();
    Y.applyUpdateV2(secondDoc, Y.encodeStateAsUpdateV2(ctx.doc));
    const secondEditor = BlockNoteEditor.create(
      withCollaboration({
        collaboration: {
          fragment: secondDoc.get("doc"),
          user: { name: "Peer", color: "#00FF00" },
          provider: undefined,
        },
      }),
    );
    const div2 = document.createElement("div");
    secondEditor.mount(div2);

    // The second editor (synced from original doc) should still show "Before fork"
    expect(getEditorText(secondEditor)).toBe("Before fork");

    secondEditor.unmount();
    secondDoc.destroy();
  });

  it("fork({ initialUpdate }) + merge({ keepChanges: true }) applies forked edits to original", () => {
    ctx = createCollabEditor();
    setEditorText(ctx.editor, "Current content");

    // Take a snapshot
    const snapshotDoc = new Y.Doc();
    Y.applyUpdateV2(snapshotDoc, Y.encodeStateAsUpdateV2(ctx.doc));

    // Move the live doc forward
    setEditorText(ctx.editor, "Live content");

    // Fork from the snapshot
    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;
    forkYDoc.fork({ initialUpdate: Y.encodeStateAsUpdateV2(snapshotDoc) });
    expect(getEditorText(ctx.editor)).toBe("Current content");

    // Edit while forked
    setEditorText(ctx.editor, "Forked modification");

    // Merge and keep changes — the forked edits are applied to the original
    // doc. Because both fork and original have concurrent edits, the CRDT
    // merge produces interleaved content rather than a clean replacement.
    forkYDoc.merge({ keepChanges: true });
    const text = getEditorText(ctx.editor);
    // The result should contain text from the forked edit (CRDT merges both).
    expect(text).toContain("Fork");
    expect(text).toContain("modification");
  });
});
