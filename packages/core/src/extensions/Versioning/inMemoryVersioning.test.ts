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
import { VersioningExtension } from "./Versioning.js";
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

    const snap = await endpoints.create(blocks, { name: "v1" });
    expect(snap.name).toBe("v1");
    expect(snap.id).toBeDefined();

    const content = await endpoints.getContent(snap.id);
    expect(content).toEqual(blocks);
    // Content is a deep clone, not a reference
    expect(content).not.toBe(blocks);
  });

  it("lists snapshots newest-first", async () => {
    vi.useFakeTimers();
    try {
      const endpoints = createInMemoryVersioningEndpoints();

      const s1 = await endpoints.create([
        {
          id: "1",
          type: "paragraph" as const,
          content: "v1" as any,
          props: {} as any,
          children: [],
        },
      ]);
      vi.advanceTimersByTime(1000);
      const s2 = await endpoints.create([
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
    const snap = await endpoints.create(original);

    const currentDoc = [
      {
        id: "2",
        type: "paragraph" as const,
        content: "modified" as any,
        props: {} as any,
        children: [],
      },
    ];
    const restored = await endpoints.restore!(currentDoc, snap.id);

    expect(restored).toEqual(original);

    // A backup snapshot was created
    const list = await endpoints.list();
    expect(list.length).toBe(2);
    const backup = list.find((s) => s.restoredFromSnapshotId === snap.id);
    expect(backup).toBeDefined();

    // The backup contains the current (pre-restore) doc
    const backupContent = await endpoints.getContent(backup!.id);
    expect(backupContent).toEqual(currentDoc);
  });

  it("updates snapshot name", async () => {
    const endpoints = createInMemoryVersioningEndpoints();
    const snap = await endpoints.create(
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

    await endpoints.updateSnapshotName!(snap.id, "new");

    const list = await endpoints.list();
    expect(list.find((s) => s.id === snap.id)!.name).toBe("new");
  });

  it("throws for unknown snapshot ID", async () => {
    const endpoints = createInMemoryVersioningEndpoints();
    await expect(endpoints.getContent("nope")).rejects.toThrow(/not found/i);
    await expect(endpoints.restore!([], "nope")).rejects.toThrow(/not found/i);
    await expect(endpoints.updateSnapshotName!("nope", "x")).rejects.toThrow(
      /not found/i,
    );
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
    const snap1 = await ext.createSnapshot({ name: "v1" });
    expect(snap1.name).toBe("v1");

    // 2. Modify the document
    setEditorText(editor, "modified doc");

    // 3. Create another snapshot
    await ext.createSnapshot({ name: "v2" });

    // 4. List — both present
    const list = await ext.listSnapshots();
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
    const restored = await ext.restoreSnapshot!(snap1.id);
    expect(restored).toBeDefined();
    expect(getEditorText(editor)).toBe("initial doc");

    // 8. A backup snapshot was created by the endpoints
    const afterRestore = await ext.listSnapshots();
    expect(afterRestore.length).toBe(3);
    const backup = afterRestore.find(
      (s) => s.restoredFromSnapshotId === snap1.id,
    );
    expect(backup).toBeDefined();
  });

  it("preview with compareTo fetches both contents", async () => {
    const adapter = createInMemoryVersioningAdapter(editor);
    const ext = VersioningExtension(adapter)({ editor });

    const snap1 = await ext.createSnapshot({ name: "baseline" });
    setEditorText(editor, "changed doc");
    const snap2 = await ext.createSnapshot({ name: "current" });

    // Preview snap2 compared to snap1. The in-memory preview controller
    // ignores the compareTo content (no diff rendering), but the call should
    // succeed and show the snapshot content.
    await ext.previewSnapshot(snap2.id, { compareTo: snap1.id });
    expect(getEditorText(editor)).toBe("changed doc");

    ext.exitPreview();
    expect(getEditorText(editor)).toBe("changed doc");
  });

  it("rename persists through list refresh", async () => {
    const adapter = createInMemoryVersioningAdapter(editor);
    const ext = VersioningExtension(adapter)({ editor });

    const snap = await ext.createSnapshot({ name: "draft" });
    await ext.updateSnapshotName!(snap.id, "final");

    // Store was updated optimistically
    expect(ext.store.state.snapshots.find((s) => s.id === snap.id)!.name).toBe(
      "final",
    );

    // Backend also updated (verified via listSnapshots which calls endpoints.list)
    const list = await ext.listSnapshots();
    expect(list.find((s) => s.id === snap.id)!.name).toBe("final");
  });
});
