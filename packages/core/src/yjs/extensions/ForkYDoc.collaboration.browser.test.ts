import { describe, expect, type TestContext } from "vite-plus/test";
import { trackPosition } from "../../api/positionMapping.js";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import type { SetupEditor } from "../../../../../tests/src/commands/browser/setupEditor.js";
import type { BlockNoteEditor } from "../../index.js";
import { ForkYDocExtension } from "./ForkYDoc.js";
import { withCollaboration } from "./index.js";
import type { ExtensionFactoryInstance } from "../../editor/BlockNoteExtension.js";
import {
  createVersioningExtension,
  type VersioningController,
} from "../../extensions/Versioning/Versioning.js";
import { createYjsVersionView } from "./Versioning.js";
import { yUndoPluginKey } from "y-prosemirror";

type EditorFixtures = {
  setupEditor: SetupEditor;
  onTestFinished: TestContext["onTestFinished"];
};

async function createCollabEditor(
  { setupEditor, onTestFinished }: EditorFixtures,
  extensions: (
    fragment: Y.XmlFragment,
  ) => ExtensionFactoryInstance[] = () => [],
) {
  const doc = new Y.Doc();
  onTestFinished(() => doc.destroy());
  const fragment = doc.getXmlFragment("doc");
  // Awareness binds its destroy handler to the doc and clears its interval there.
  const awareness = new Awareness(doc);
  const { editor } = await setupEditor({
    mountType: "dom",
    ...withCollaboration({
      extensions: extensions(fragment),
      collaboration: {
        fragment,
        user: { name: "Test User", color: "#FF0000" },
        provider: { awareness },
      },
    }),
  });
  const fork = editor.getExtension(ForkYDocExtension);
  // Tests that leave a fork open must discard it before the editor unmounts.
  onTestFinished(() => fork?.merge({ keepChanges: false }));
  return { editor, doc, fragment };
}

function getEditorText(editor: BlockNoteEditor) {
  return editor.document
    .flatMap(({ content }) => (Array.isArray(content) ? content : []))
    .map((inline) => (inline.type === "text" ? inline.text : ""))
    .join("");
}

function setEditorText(editor: BlockNoteEditor, text: string) {
  editor.replaceBlocks(editor.document, [
    {
      type: "paragraph",
      content: [{ text, styles: {}, type: "text" }],
    },
  ]);
}

describe("ForkYDocExtension", () => {
  it("detaches undo through version previews and resumes fresh live history", async ({
    setupEditor,
    onTestFinished,
  }) => {
    let snapshot: Uint8Array = new Uint8Array();
    const ctx = await createCollabEditor(
      { setupEditor, onTestFinished },
      (fragment) => [
        createVersioningExtension((editor) => ({
          adapter: createYjsVersionView(editor, fragment),
          storage: {
            async list() {
              return { ok: true, value: { snapshots: [] } };
            },
            async getContent() {
              return { ok: true, value: snapshot };
            },
          },
        }))(),
      ],
    );
    const versions =
      ctx.editor.getExtension<VersioningController>("versioning")!;
    try {
      setEditorText(ctx.editor, "Snapshot");
      snapshot = Y.encodeStateAsUpdate(ctx.doc);
      setEditorText(ctx.editor, "Live");
      const live = Y.encodeStateAsUpdate(ctx.doc);
      expect(
        yUndoPluginKey.getState(ctx.editor.prosemirrorState)!.undoManager
          .undoStack.length,
      ).toBeGreaterThan(0);
      versions.open();
      expect(ctx.editor.isEditable).toBe(false);
      for (const target of [
        { type: "snapshot", id: "saved" },
        { type: "current" },
        { type: "snapshot", id: "saved" },
      ] as const) {
        await versions.select(target);
        expect(getEditorText(ctx.editor)).toBe(
          target.type === "current" ? "Live" : "Snapshot",
        );
        expect(ctx.editor.getExtension("yUndo")).toBeUndefined();
        expect(Y.encodeStateAsUpdate(ctx.doc)).toEqual(live);
      }
      versions.close();
      expect(getEditorText(ctx.editor)).toBe("Live");
      expect(ctx.editor.isEditable).toBe(true);
      expect(ctx.editor.undo()).toBe(false);
      expect(ctx.editor.redo()).toBe(false);
      setEditorText(ctx.editor, "New edit");
      expect(ctx.editor.undo()).toBe(true);
      expect(getEditorText(ctx.editor)).toBe("Live");
      expect(ctx.editor.redo()).toBe(true);
      expect(getEditorText(ctx.editor)).toBe("New edit");
    } finally {
      versions.close();
    }
  });

  it("forks the document — edits do not affect the original fragment", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const ctx = await createCollabEditor({
      setupEditor,
      onTestFinished,
    });
    setEditorText(ctx.editor, "Original");

    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;
    forkYDoc.fork();

    // Edit while forked
    setEditorText(ctx.editor, "Forked edit");

    // The original fragment should still have the original content
    expect(ctx.fragment.toJSON()).toContain("Original");
    expect(getEditorText(ctx.editor)).toBe("Forked edit");
  });

  it("merge({ keepChanges: false }) discards forked edits", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const ctx = await createCollabEditor({
      setupEditor,
      onTestFinished,
    });
    setEditorText(ctx.editor, "Original");

    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;
    forkYDoc.fork();
    setEditorText(ctx.editor, "Forked edit");

    forkYDoc.merge({ keepChanges: false });

    expect(getEditorText(ctx.editor)).toBe("Original");
  });

  it("merge({ keepChanges: true }) applies forked edits to the original doc", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const ctx = await createCollabEditor({
      setupEditor,
      onTestFinished,
    });
    setEditorText(ctx.editor, "Original");

    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;
    forkYDoc.fork();
    setEditorText(ctx.editor, "Forked edit");

    forkYDoc.merge({ keepChanges: true });

    // The editor and original fragment should both reflect the forked edit
    expect(getEditorText(ctx.editor)).toContain("Forked edit");
  });

  it("fork({ initialUpdate }) uses the provided update instead of the live doc", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const ctx = await createCollabEditor({
      setupEditor,
      onTestFinished,
    });
    setEditorText(ctx.editor, "Current content");

    // Create a snapshot of an earlier state
    const snapshotDoc = new Y.Doc();
    onTestFinished(() => snapshotDoc.destroy());
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

  it("fork({ initialUpdate }) + merge({ keepChanges: false }) restores live doc", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const ctx = await createCollabEditor({
      setupEditor,
      onTestFinished,
    });
    setEditorText(ctx.editor, "Live content");

    // Create a snapshot update
    const snapshotDoc = new Y.Doc();
    onTestFinished(() => snapshotDoc.destroy());
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

  it("calling fork() while already forked is a no-op", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const ctx = await createCollabEditor({
      setupEditor,
      onTestFinished,
    });
    setEditorText(ctx.editor, "Original");

    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;
    forkYDoc.fork();
    setEditorText(ctx.editor, "Forked edit");

    // Second fork should be a no-op
    forkYDoc.fork();
    expect(getEditorText(ctx.editor)).toBe("Forked edit");
  });

  it("isForked store state reflects fork/merge lifecycle", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const ctx = await createCollabEditor({
      setupEditor,
      onTestFinished,
    });
    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;

    expect(forkYDoc.store.state.isForked).toBe(false);

    forkYDoc.fork();
    expect(forkYDoc.store.state.isForked).toBe(true);

    forkYDoc.merge({ keepChanges: false });
    expect(forkYDoc.store.state.isForked).toBe(false);
  });

  it("merge() is a no-op when not forked", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const ctx = await createCollabEditor({
      setupEditor,
      onTestFinished,
    });
    setEditorText(ctx.editor, "Untouched");

    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;

    // Should not throw or change anything.
    forkYDoc.merge({ keepChanges: false });
    forkYDoc.merge({ keepChanges: true });

    expect(getEditorText(ctx.editor)).toBe("Untouched");
    expect(forkYDoc.store.state.isForked).toBe(false);
  });

  it("forked doc is isolated from the original Y.Doc", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const ctx = await createCollabEditor({
      setupEditor,
      onTestFinished,
    });
    setEditorText(ctx.editor, "Before fork");

    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;
    forkYDoc.fork();

    // Edit while forked
    setEditorText(ctx.editor, "Forked edit");

    // The original fragment should still have "Before fork"
    expect(ctx.fragment.toJSON()).toContain("Before fork");
    expect(ctx.fragment.toJSON()).not.toContain("Forked edit");
  });

  it("fork({ initialUpdate }) + merge({ keepChanges: true }) applies forked edits to original", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const ctx = await createCollabEditor({
      setupEditor,
      onTestFinished,
    });
    setEditorText(ctx.editor, "Current content");

    // Take a snapshot
    const snapshotDoc = new Y.Doc();
    onTestFinished(() => snapshotDoc.destroy());
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
  it("can track positions while forked", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const ctx = await createCollabEditor({
      setupEditor,
      onTestFinished,
    });
    setEditorText(ctx.editor, "Hello World");

    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;
    forkYDoc.fork();

    // Store position at "Hello| World"
    const getCursorPos = trackPosition(ctx.editor, 8);
    expect(getCursorPos()).toBe(8);

    // Insert text at the beginning of "|Hello World"
    ctx.editor.setTextCursorPosition(ctx.editor.document[0], "start");
    ctx.editor.insertInlineContent("Test ");
    expect(getCursorPos()).toBe(13);
  });

  // https://github.com/TypeCellOS/BlockNote/issues/2946
  it("can track positions across fork and merge", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const ctx = await createCollabEditor({
      setupEditor,
      onTestFinished,
    });
    setEditorText(ctx.editor, "Hello World");

    // Store position at "Hello| World"
    const getCursorPos = trackPosition(ctx.editor, 8);

    const forkYDoc = ctx.editor.getExtension(ForkYDocExtension)!;
    forkYDoc.fork();
    expect(getCursorPos()).toBe(8);

    ctx.editor.setTextCursorPosition(ctx.editor.document[0], "start");
    ctx.editor.insertInlineContent("Test ");
    expect(getCursorPos()).toBe(13);

    forkYDoc.merge({ keepChanges: true });
    expect(getCursorPos()).toBe(13);
  });
});
