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
import { DiffVersioningExtension } from "../../y/extensions/DiffVersioningExtension.js";
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

    const snap = await endpoints.create!(blocks, { name: "v1" });
    expect(snap.name).toBe("v1");
    expect(snap.id).toBeDefined();

    const content = await endpoints.getContent(snap);
    expect(content).toEqual(blocks);
    // Content is a deep clone, not a reference
    expect(content).not.toBe(blocks);
  });

  it("starts with the given initial versions, newest-first", async () => {
    const older = [{ type: "paragraph", content: "older" }] as any;
    const newer = [{ type: "paragraph", content: "newer" }] as any;
    const endpoints = createInMemoryVersioningEndpoints({
      initialVersions: [
        { name: "Older", createdAt: 1000, content: older },
        { createdAt: 2000, content: newer },
      ],
    });

    const { snapshots } = await endpoints.list();
    expect(
      snapshots.map((s) => ({ name: s.name, createdAt: s.createdAt })),
    ).toEqual([
      { name: undefined, createdAt: 2000 },
      { name: "Older", createdAt: 1000 },
    ]);
    expect(await endpoints.getContent(snapshots[1]!)).toEqual(older);
    // Stored as a copy: mutating what was passed in doesn't change history.
    older[0].content = "changed";
    expect(await endpoints.getContent(snapshots[1]!)).not.toEqual(older);
  });

  it("sorts versions created later above the initial ones", async () => {
    const future = Date.now() + 60_000;
    const endpoints = createInMemoryVersioningEndpoints({
      initialVersions: [{ name: "Loaded", createdAt: future, content: [] }],
    });

    const created = await endpoints.create!([], { name: "New" });
    expect(created.createdAt).toBeGreaterThan(future);
    const { snapshots } = await endpoints.list();
    expect(snapshots.map((s) => s.name)).toEqual(["New", "Loaded"]);
  });

  it("lists snapshots newest-first", async () => {
    vi.useFakeTimers();
    try {
      const endpoints = createInMemoryVersioningEndpoints();

      const s1 = await endpoints.create!(
        [
          {
            id: "1",
            type: "paragraph" as const,
            content: "v1" as any,
            props: {} as any,
            children: [],
          },
        ],
        {},
      );
      vi.advanceTimersByTime(1000);
      const s2 = await endpoints.create!(
        [
          {
            id: "2",
            type: "paragraph" as const,
            content: "v2" as any,
            props: {} as any,
            children: [],
          },
        ],
        {},
      );

      const { snapshots } = await endpoints.list();
      expect(snapshots[0].id).toBe(s2.id);
      expect(snapshots[1].id).toBe(s1.id);
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
    const snap = await endpoints.create!(original, {});

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

    // A backup version was created, and the current row records what the
    // document was restored from.
    const { current, snapshots } = await endpoints.list();
    expect(snapshots.length).toBe(2);
    expect(current.restoredFrom).toEqual({
      id: snap.id,
      createdAt: snap.createdAt,
    });
    const backup = snapshots.find((s) => s.name === "Before restore");
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

    const { snapshots } = await endpoints.list();
    expect(snapshots.find((s) => s.id === snap.id)!.name).toBe("new");
  });

  it("deletes a snapshot and its content", async () => {
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
      {},
    );

    await endpoints.remove!(snap);

    // No longer listed
    expect((await endpoints.list()).snapshots).toHaveLength(0);
    // Its content is gone too
    await expect(endpoints.getContent(snap)).rejects.toThrow(/not found/i);
  });

  it("throws for unknown snapshot ID", async () => {
    const endpoints = createInMemoryVersioningEndpoints();
    const missing = { id: "nope", createdAt: 0 };
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

    // 4. List — both stored versions are present, alongside the current entry.
    const { snapshots } = await ext.list();
    expect(snapshots).toHaveLength(2);
    expect(snapshots.map((s) => s.name)).toContain("v1");
    expect(snapshots.map((s) => s.name)).toContain("v2");

    // 5. Preview the first version
    await ext.previewSnapshot(snap1.id);
    expect(getEditorText(editor)).toBe("initial doc");
    expect(ext.store.state.view).toEqual({
      mode: "snapshot",
      snapshotId: snap1.id,
      compareToId: undefined,
    });

    // 6. Exit preview — back to modified doc
    ext.exitPreview();
    expect(getEditorText(editor)).toBe("modified doc");
    expect(ext.store.state.view).toEqual({ mode: "live" });

    // 7. Restore the first version
    const restored = await ext.restore!(snap1.id);
    expect(restored).toBeDefined();
    expect(getEditorText(editor)).toBe("initial doc");

    // 8. A backup version was created by the endpoints, and the current row
    // records where the restore came from.
    const afterRestore = await ext.list();
    expect(afterRestore.snapshots.length).toBe(3);
    expect(afterRestore.current.restoredFrom).toEqual({
      id: snap1.id,
      createdAt: snap1.createdAt,
    });
  });

  it("stamps the current row with the last edit time", async () => {
    const adapter = createInMemoryVersioningAdapter(editor);
    const ext = VersioningExtension(adapter)({ editor });

    const before = Date.now();
    setEditorText(editor, "edited doc");

    const { current } = await ext.list();
    expect(current.createdAt).toBeGreaterThanOrEqual(before);
  });

  it("stamps a restore before refreshing the current row", async () => {
    const adapter = createInMemoryVersioningAdapter(editor);
    const ext = VersioningExtension(adapter)({ editor });
    const snapshot = await ext.create!();
    setEditorText(editor, "new content");
    await ext.previewSnapshot(snapshot.id);

    const restoredAt = Date.now() + 1000;
    const clock = vi.spyOn(Date, "now").mockReturnValue(restoredAt);
    try {
      await ext.restore!(snapshot.id);
      expect(ext.store.state.list).toMatchObject({
        loaded: true,
        current: { createdAt: restoredAt },
      });
    } finally {
      clock.mockRestore();
    }
  });

  it("preview with compareTo fetches both contents", async () => {
    const adapter = createInMemoryVersioningAdapter(editor);
    const ext = VersioningExtension(adapter)({ editor });

    const snap1 = await ext.create!({ name: "baseline" });
    setEditorText(editor, "changed doc");
    const snap2 = await ext.create!({ name: "current" });

    // Preview snap2 compared to snap1. Without the (opt-in) DiffVersioningExtension
    // registered, the in-memory preview controller falls back to a static swap:
    // it shows the snapshot content and renders no diff marks.
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

    expect(ext.remove).toBeDefined();
    await ext.remove!(snap2.id);

    // Gone from the backend's authoritative list.
    const { snapshots } = await ext.list();
    expect(snapshots.map((s) => s.id)).toEqual([snap1.id]);
  });

  it("deleting the previewed snapshot exits preview", async () => {
    const adapter = createInMemoryVersioningAdapter(editor);
    const ext = VersioningExtension(adapter)({ editor });

    const snap = await ext.create!({ name: "v1" });
    setEditorText(editor, "modified doc");

    // Preview the version, then delete the one being previewed.
    await ext.previewSnapshot(snap.id);
    expect(ext.store.state.view).toEqual({
      mode: "snapshot",
      snapshotId: snap.id,
      compareToId: undefined,
    });

    await ext.remove!(snap.id);

    // Preview was exited and the live document restored.
    expect(ext.store.state.view).toEqual({ mode: "live" });
    expect(getEditorText(editor)).toBe("modified doc");
  });

  it("rename persists through list refresh", async () => {
    const adapter = createInMemoryVersioningAdapter(editor);
    const ext = VersioningExtension(adapter)({ editor });

    const snap = await ext.create!({ name: "draft" });
    await ext.rename!(snap.id, "final");

    // Store was patched in place
    const listed = ext.store.state.list;
    expect(listed.loaded).toBe(true);
    expect(
      listed.loaded
        ? listed.snapshots.find((s) => s.id === snap.id)!.name
        : undefined,
    ).toBe("final");

    // Backend also updated (verified via list which calls endpoints.list)
    const { snapshots } = await ext.list();
    expect(snapshots.find((s) => s.id === snap.id)!.name).toBe("final");
  });
});

// ---------------------------------------------------------------------------
// Tests — diff delegation to the opt-in DiffVersioningExtension
// ---------------------------------------------------------------------------

describe("in-memory versioning + DiffVersioningExtension", () => {
  let editor: BlockNoteEditor<any, any, any>;

  beforeEach(() => {
    editor = BlockNoteEditor.create({
      extensions: [DiffVersioningExtension()],
    });
    editor.mount(document.createElement("div"));
    setEditorText(editor, "initial doc");
  });

  afterEach(() => {
    editor.unmount();
  });

  const attributionMarkCount = () => {
    let count = 0;
    editor.prosemirrorState.doc.descendants((node) => {
      count += node.marks.filter((m) =>
        m.type.name.startsWith("y-attributed-"),
      ).length;
      return true;
    });
    return count;
  };

  it("previewing with compareTo renders an attributed diff", async () => {
    const adapter = createInMemoryVersioningAdapter(editor);
    const ext = VersioningExtension(adapter)({ editor });

    const snap1 = await ext.create!({ name: "baseline" });
    setEditorText(editor, "changed doc");
    const snap2 = await ext.create!({ name: "current" });

    await ext.previewSnapshot(snap2.id, { compareTo: snap1.id });

    // The diff extension rendered attribution marks (initial vs changed doc).
    expect(attributionMarkCount()).toBeGreaterThan(0);

    // Exiting the preview clears the marks and restores the live document.
    ext.exitPreview();
    expect(attributionMarkCount()).toBe(0);
    expect(getEditorText(editor)).toBe("changed doc");
  });

  it("previewing without compareTo shows content with no diff marks", async () => {
    const adapter = createInMemoryVersioningAdapter(editor);
    const ext = VersioningExtension(adapter)({ editor });

    const snap1 = await ext.create!({ name: "baseline" });
    setEditorText(editor, "changed doc");

    await ext.previewSnapshot(snap1.id);

    expect(getEditorText(editor)).toBe("initial doc");
    expect(attributionMarkCount()).toBe(0);
  });
});
