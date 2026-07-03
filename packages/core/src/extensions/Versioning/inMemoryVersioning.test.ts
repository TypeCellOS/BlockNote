/**
 * @vitest-environment jsdom
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { CURRENT_VERSION_ID, VersioningExtension } from "./Versioning.js";
import {
  createInMemoryPreviewController,
  createInMemoryVersioningAdapter,
  createInMemoryVersioningEndpoints,
} from "./inMemoryVersioning.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEditor() {
  const editor = BlockNoteEditor.create();
  const div = document.createElement("div");
  editor.mount(div);
  return editor;
}

function getEditorText(editor: BlockNoteEditor<any, any, any>): string {
  return editor.prosemirrorState.doc.textContent;
}

function setEditorText(editor: BlockNoteEditor<any, any, any>, text: string) {
  editor.replaceBlocks(editor.document, [{ type: "paragraph", content: text }]);
}

// ---------------------------------------------------------------------------
// Tests — createInMemoryVersioningEndpoints
// ---------------------------------------------------------------------------

describe("createInMemoryVersioningEndpoints", () => {
  it("creates and retrieves snapshots", async () => {
    const endpoints = createInMemoryVersioningEndpoints();
    const blocks = [
      {
        id: "1",
        type: "paragraph" as const,
        content: [] as any,
        props: {} as any,
        children: [],
      },
    ];

    const snap = await endpoints.create!(blocks, { name: "v1" });
    expect(snap.name).toBe("v1");
    expect(snap.id).toBeDefined();

    const content = await endpoints.getContent(snap);
    expect(content).toEqual(blocks);
    // Content is a deep clone, not a reference
    expect(content).not.toBe(blocks);
  });

  it("lists snapshots newest-first", async () => {
    vi.useFakeTimers();
    try {
      const endpoints = createInMemoryVersioningEndpoints();

      const s1 = await endpoints.create!([
        {
          id: "1",
          type: "paragraph" as const,
          content: "v1" as any,
          props: {} as any,
          children: [],
        },
      ]);
      vi.advanceTimersByTime(1000);
      const s2 = await endpoints.create!([
        {
          id: "2",
          type: "paragraph" as const,
          content: "v2" as any,
          props: {} as any,
          children: [],
        },
      ]);

      const list = await endpoints.list();
      expect(list[0].id).toBe(s2.id);
      expect(list[1].id).toBe(s1.id);
    } finally {
      vi.useRealTimers();
    }
  });

  it("restore creates a backup and returns snapshot content", async () => {
    const endpoints = createInMemoryVersioningEndpoints();

    const original = [
      {
        id: "1",
        type: "paragraph" as const,
        content: "original" as any,
        props: {} as any,
        children: [],
      },
    ];
    const snap = await endpoints.create!(original);

    const currentDoc = [
      {
        id: "2",
        type: "paragraph" as const,
        content: "modified" as any,
        props: {} as any,
        children: [],
      },
    ];
    const restored = await endpoints.restore!(currentDoc, snap);

    expect(restored).toEqual(original);

    // A backup snapshot was created
    const list = await endpoints.list();
    expect(list.length).toBe(2);
    const backup = list.find((s) => s.restoredFromSnapshotId === snap.id);
    expect(backup).toBeDefined();

    // The backup contains the current (pre-restore) doc
    const backupContent = await endpoints.getContent(backup!);
    expect(backupContent).toEqual(currentDoc);
  });

  it("updates snapshot name", async () => {
    const endpoints = createInMemoryVersioningEndpoints();
    const snap = await endpoints.create!(
      [
        {
          id: "1",
          type: "paragraph" as const,
          content: "v1" as any,
          props: {} as any,
          children: [],
        },
      ],
      { name: "old" },
    );

    await endpoints.rename!(snap, "new");

    const list = await endpoints.list();
    expect(list.find((s) => s.id === snap.id)!.name).toBe("new");
  });

  it("deletes a snapshot and its content", async () => {
    const endpoints = createInMemoryVersioningEndpoints();
    const snap = await endpoints.create!([
      {
        id: "1",
        type: "paragraph" as const,
        content: "v1" as any,
        props: {} as any,
        children: [],
      },
    ]);

    await endpoints.remove!(snap);

    // No longer listed
    expect(await endpoints.list()).toHaveLength(0);
    // Its content is gone too
    await expect(endpoints.getContent(snap)).rejects.toThrow(/not found/i);
  });

  it("throws for unknown snapshot ID", async () => {
    const endpoints = createInMemoryVersioningEndpoints();
    const missing = { id: "nope", createdAt: 0, updatedAt: 0 };
    await expect(endpoints.getContent(missing)).rejects.toThrow(/not found/i);
    await expect(endpoints.restore!([], missing)).rejects.toThrow(/not found/i);
    await expect(endpoints.rename!(missing, "x")).rejects.toThrow(/not found/i);
    await expect(endpoints.remove!(missing)).rejects.toThrow(/not found/i);
  });
});

// ---------------------------------------------------------------------------
// Tests — createInMemoryPreviewController
// ---------------------------------------------------------------------------

describe("createInMemoryPreviewController", () => {
  let editor: BlockNoteEditor<any, any, any>;

  beforeEach(() => {
    editor = createEditor();
    setEditorText(editor, "live content");
  });

  afterEach(() => {
    editor.unmount();
  });

  it("enterPreview replaces doc and exitPreview restores it", () => {
    const preview = createInMemoryPreviewController(editor);

    // Grab the snapshot content we want to preview — a doc with different text.
    const previewEditor = createEditor();
    setEditorText(previewEditor, "snapshot content");
    const snapshotBlocks = previewEditor.document;
    previewEditor.unmount();

    preview.enterPreview(snapshotBlocks);
    expect(getEditorText(editor)).toBe("snapshot content");

    preview.exitPreview();
    expect(getEditorText(editor)).toBe("live content");
  });

  it("successive enterPreview calls preserve original doc", () => {
    const preview = createInMemoryPreviewController(editor);

    const mkSnap = (text: string) => {
      const e = createEditor();
      setEditorText(e, text);
      const blocks = e.document;
      e.unmount();
      return blocks;
    };

    preview.enterPreview(mkSnap("snap A"));
    expect(getEditorText(editor)).toBe("snap A");

    preview.enterPreview(mkSnap("snap B"));
    expect(getEditorText(editor)).toBe("snap B");

    // Exit restores the original live doc, not snap A.
    preview.exitPreview();
    expect(getEditorText(editor)).toBe("live content");
  });

  it("applyRestore replaces doc and clears saved state", () => {
    const preview = createInMemoryPreviewController(editor);

    const mkSnap = (text: string) => {
      const e = createEditor();
      setEditorText(e, text);
      const blocks = e.document;
      e.unmount();
      return blocks;
    };

    // Enter preview first
    preview.enterPreview(mkSnap("previewed"));
    expect(getEditorText(editor)).toBe("previewed");

    // Now restore — this is the "apply" step after endpoints.restore returns
    preview.applyRestore(mkSnap("restored"));
    expect(getEditorText(editor)).toBe("restored");

    // exitPreview should be a no-op since savedDoc was cleared
    preview.exitPreview();
    expect(getEditorText(editor)).toBe("restored");
  });
});

// ---------------------------------------------------------------------------
// Tests — Full integration with VersioningExtension
// ---------------------------------------------------------------------------

describe("VersioningExtension + in-memory adapter", () => {
  let editor: BlockNoteEditor<any, any, any>;

  beforeEach(() => {
    editor = createEditor();
    setEditorText(editor, "initial doc");
  });

  afterEach(() => {
    editor.unmount();
  });

  it("create, preview, exit, restore full workflow", async () => {
    const adapter = createInMemoryVersioningAdapter(editor);
    const ext = VersioningExtension(adapter)({ editor });

    // 1. Create a snapshot of "initial doc"
    const snap1 = await ext.create!({ name: "v1" });
    expect(snap1.name).toBe("v1");

    // 2. Modify the document
    setEditorText(editor, "modified doc");

    // 3. Create another snapshot
    await ext.create!({ name: "v2" });

    // 4. List — both present (the adapter also surfaces a "current version"
    // entry, which isn't a stored snapshot).
    const list = (await ext.list()).filter((s) => s.id !== CURRENT_VERSION_ID);
    expect(list).toHaveLength(2);
    expect(list.map((s) => s.name)).toContain("v1");
    expect(list.map((s) => s.name)).toContain("v2");

    // 5. Preview the first snapshot
    await ext.previewSnapshot(snap1.id);
    expect(getEditorText(editor)).toBe("initial doc");
    expect(ext.store.state.previewedSnapshotId).toBe(snap1.id);

    // 6. Exit preview — back to modified doc
    ext.exitPreview();
    expect(getEditorText(editor)).toBe("modified doc");
    expect(ext.store.state.previewedSnapshotId).toBeUndefined();

    // 7. Restore the first snapshot
    const restored = await ext.restore!(snap1.id);
    expect(restored).toBeDefined();
    expect(getEditorText(editor)).toBe("initial doc");

    // 8. A backup snapshot was created by the endpoints (plus the adapter's
    // "current version" entry, which isn't a stored snapshot).
    const afterRestore = (await ext.list()).filter(
      (s) => s.id !== CURRENT_VERSION_ID,
    );
    expect(afterRestore.length).toBe(3);
    const backup = afterRestore.find(
      (s) => s.restoredFromSnapshotId === snap1.id,
    );
    expect(backup).toBeDefined();
  });

  it("preview with compareTo fetches both contents", async () => {
    const adapter = createInMemoryVersioningAdapter(editor);
    const ext = VersioningExtension(adapter)({ editor });

    const snap1 = await ext.create!({ name: "baseline" });
    setEditorText(editor, "changed doc");
    const snap2 = await ext.create!({ name: "current" });

    // Preview snap2 compared to snap1. The in-memory preview controller
    // ignores the compareTo content (no diff rendering), but the call should
    // succeed and show the snapshot content.
    await ext.previewSnapshot(snap2.id, { compareTo: snap1.id });
    expect(getEditorText(editor)).toBe("changed doc");

    ext.exitPreview();
    expect(getEditorText(editor)).toBe("changed doc");
  });

  it("delete removes the snapshot from the store and backend", async () => {
    const adapter = createInMemoryVersioningAdapter(editor);
    const ext = VersioningExtension(adapter)({ editor });

    const snap1 = await ext.create!({ name: "keep" });
    setEditorText(editor, "changed doc");
    const snap2 = await ext.create!({ name: "remove" });
    await ext.list();

    expect(ext.canRemove).toBe(true);
    await ext.remove!(snap2.id);

    // Gone from the optimistic store...
    expect(
      ext.store.state.snapshots.find((s) => s.id === snap2.id),
    ).toBeUndefined();
    // ...and gone from the backend's authoritative list.
    const list = (await ext.list()).filter((s) => s.id !== CURRENT_VERSION_ID);
    expect(list.map((s) => s.id)).toEqual([snap1.id]);
  });

  it("deleting the previewed snapshot exits preview", async () => {
    const adapter = createInMemoryVersioningAdapter(editor);
    const ext = VersioningExtension(adapter)({ editor });

    const snap = await ext.create!({ name: "v1" });
    setEditorText(editor, "modified doc");

    // Preview the snapshot, then delete the version being previewed.
    await ext.previewSnapshot(snap.id);
    expect(ext.store.state.previewedSnapshotId).toBe(snap.id);

    await ext.remove!(snap.id);

    // Preview was exited and the live document restored.
    expect(ext.store.state.previewedSnapshotId).toBeUndefined();
    expect(getEditorText(editor)).toBe("modified doc");
  });

  it("rename persists through list refresh", async () => {
    const adapter = createInMemoryVersioningAdapter(editor);
    const ext = VersioningExtension(adapter)({ editor });

    const snap = await ext.create!({ name: "draft" });
    await ext.rename!(snap.id, "final");

    // Store was updated optimistically
    expect(ext.store.state.snapshots.find((s) => s.id === snap.id)!.name).toBe(
      "final",
    );

    // Backend also updated (verified via list which calls endpoints.list)
    const list = await ext.list();
    expect(list.find((s) => s.id === snap.id)!.name).toBe("final");
  });
});
