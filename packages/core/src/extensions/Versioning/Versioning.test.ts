/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  sortSnapshotsNewestFirst,
  VersioningExtension,
} from "./Versioning.js";
import type { VersionSnapshot } from "./Versioning.js";
import {
  createInMemoryPreviewController,
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
  editor.replaceBlocks(editor.document, [
    { type: "paragraph", content: text },
  ]);
}

/** Minimal snapshot factory for the sortSnapshotsNewestFirst unit test. */
function snap(
  id: string,
  createdAt: number,
  extra?: Partial<VersionSnapshot>,
): VersionSnapshot {
  return { id, createdAt, updatedAt: createdAt, ...extra };
}

/**
 * Wire up a real editor with the in-memory versioning adapter.
 *
 * Returns the extension instance, the editor, and helpers to seed snapshots
 * directly into the backend (bypassing the extension).
 */
function setup(opts?: {
  initialText?: string;
  withoutRestore?: boolean;
  withoutUpdateName?: boolean;
}) {
  const editor = createEditor();
  setEditorText(editor, opts?.initialText ?? "initial doc");

  const endpoints = createInMemoryVersioningEndpoints();
  const preview = createInMemoryPreviewController(editor);

  if (opts?.withoutRestore) {
    (endpoints as any).restore = undefined;
  }
  if (opts?.withoutUpdateName) {
    (endpoints as any).updateSnapshotName = undefined;
  }

  const ext = VersioningExtension({
    endpoints,
    preview,
    getCurrentState: () => editor.document,
  })({ editor });

  /** Seed a snapshot into the backend by capturing the current editor doc. */
  const seed = async (text: string, name?: string) => {
    // Temporarily set editor text, create via endpoints, then restore.
    const savedBlocks = editor.document;
    setEditorText(editor, text);
    const blocks = editor.document;
    const snapshot = await endpoints.create(blocks, { name });
    // Restore original text.
    editor.replaceBlocks(editor.document, savedBlocks);
    return snapshot;
  };

  return { ext, editor, endpoints, seed };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("sortSnapshotsNewestFirst", () => {
  it("sorts newest-first by createdAt", () => {
    const input = [snap("a", 100), snap("b", 300), snap("c", 200)];
    const sorted = sortSnapshotsNewestFirst(input);
    expect(sorted.map((s) => s.id)).toEqual(["b", "c", "a"]);
  });
});

describe("VersioningExtension", () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  afterEach(() => {
    ctx.editor.unmount();
  });

  // -------------------------------------------------------------------------
  // Listing snapshots
  // -------------------------------------------------------------------------

  describe("listing snapshots", () => {
    it("populates the store from the backend, sorted newest-first", async () => {
      vi.useFakeTimers();

      // Seed snapshots with distinct timestamps directly via endpoints.
      await ctx.endpoints.create([{ id: "1", type: "paragraph" as const, content: "v1" as any, props: {} as any, children: [] }]);
      vi.advanceTimersByTime(1000);
      await ctx.endpoints.create([{ id: "2", type: "paragraph" as const, content: "v2" as any, props: {} as any, children: [] }]);
      vi.advanceTimersByTime(1000);
      await ctx.endpoints.create([{ id: "3", type: "paragraph" as const, content: "v3" as any, props: {} as any, children: [] }]);

      const result = await ctx.ext.listSnapshots();

      expect(result).toHaveLength(3);
      // Newest first: v3, v2, v1
      expect(result[0]!.createdAt).toBeGreaterThan(result[1]!.createdAt);
      expect(result[1]!.createdAt).toBeGreaterThan(result[2]!.createdAt);
      expect(ctx.ext.store.state.snapshots).toEqual(result);

      vi.useRealTimers();
    });

    it("reflects backend changes on subsequent calls", async () => {
      expect(await ctx.ext.listSnapshots()).toEqual([]);

      await ctx.endpoints.create([{ id: "1", type: "paragraph" as const, content: "external" as any, props: {} as any, children: [] }]);

      const after = await ctx.ext.listSnapshots();
      expect(after).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // Creating snapshots
  // -------------------------------------------------------------------------

  describe("creating snapshots", () => {
    it("captures the current state and adds the snapshot to the store", async () => {
      setEditorText(ctx.editor, "my document content");

      const snapshot = await ctx.ext.createSnapshot({ name: "Draft 1" });

      expect(snapshot.name).toBe("Draft 1");
      expect(snapshot.id).toBeDefined();
      expect(ctx.ext.store.state.snapshots).toHaveLength(1);

      // The snapshot content should round-trip — verify by previewing.
      await ctx.ext.previewSnapshot(snapshot.id);
      expect(getEditorText(ctx.editor)).toBe("my document content");
    });

    it("maintains newest-first order when adding to existing snapshots", async () => {
      vi.useFakeTimers();

      // Seed an older snapshot.
      const old = await ctx.seed("old content", "Old");
      vi.advanceTimersByTime(1000);

      // List so the store knows about the seeded snapshot.
      await ctx.ext.listSnapshots();

      const newer = await ctx.ext.createSnapshot({ name: "Newer" });

      expect(ctx.ext.store.state.snapshots[0]!.id).toBe(newer.id);
      expect(ctx.ext.store.state.snapshots[1]!.id).toBe(old.id);

      vi.useRealTimers();
    });
  });

  // -------------------------------------------------------------------------
  // Previewing snapshots
  // -------------------------------------------------------------------------

  describe("previewing snapshots", () => {
    it("shows a snapshot and tracks it in the store", async () => {
      const snap = await ctx.seed("snapshot content");

      await ctx.ext.previewSnapshot(snap.id);

      expect(ctx.ext.store.state.previewedSnapshotId).toBe(snap.id);
      expect(getEditorText(ctx.editor)).toBe("snapshot content");
    });

    it("supports comparing against an older snapshot", async () => {
      const _v1 = await ctx.seed("content v1");
      const v2 = await ctx.seed("content v2");

      // The in-memory preview controller doesn't render diffs, but the call
      // should succeed and show the primary snapshot content.
      await ctx.ext.previewSnapshot(v2.id, { compareTo: _v1.id });

      expect(getEditorText(ctx.editor)).toBe("content v2");
    });

    it("switching previews updates to the new snapshot", async () => {
      const s1 = await ctx.seed("content s1");
      const s2 = await ctx.seed("content s2");

      await ctx.ext.previewSnapshot(s1.id);
      expect(getEditorText(ctx.editor)).toBe("content s1");

      await ctx.ext.previewSnapshot(s2.id);
      expect(ctx.ext.store.state.previewedSnapshotId).toBe(s2.id);
      expect(getEditorText(ctx.editor)).toBe("content s2");
    });
  });

  // -------------------------------------------------------------------------
  // Exiting preview
  // -------------------------------------------------------------------------

  describe("exiting preview", () => {
    it("clears the preview state and restores the live document", async () => {
      setEditorText(ctx.editor, "live content");
      const snap = await ctx.seed("snapshot content");

      await ctx.ext.previewSnapshot(snap.id);
      expect(getEditorText(ctx.editor)).toBe("snapshot content");

      ctx.ext.exitPreview();

      expect(ctx.ext.store.state.previewedSnapshotId).toBeUndefined();
      expect(getEditorText(ctx.editor)).toBe("live content");
    });
  });

  // -------------------------------------------------------------------------
  // Restoring snapshots
  // -------------------------------------------------------------------------

  describe("restoring snapshots", () => {
    it("applies the snapshot content and exits any active preview", async () => {
      setEditorText(ctx.editor, "current doc");
      const snap = await ctx.seed("old content");

      // Enter preview first, then restore.
      await ctx.ext.previewSnapshot(snap.id);
      await ctx.ext.restoreSnapshot!(snap.id);

      expect(getEditorText(ctx.editor)).toBe("old content");
      expect(ctx.ext.store.state.previewedSnapshotId).toBeUndefined();
    });

    it("picks up server-side backup snapshots after re-listing", async () => {
      const snap = await ctx.seed("original");
      await ctx.ext.listSnapshots();

      await ctx.ext.restoreSnapshot!(snap.id);

      // The in-memory endpoints create a backup snapshot on restore.
      const updated = await ctx.ext.listSnapshots();
      expect(updated.length).toBe(2);
      expect(updated.some((s) => s.restoredFromSnapshotId === snap.id)).toBe(
        true,
      );
    });

    it("reports restore as unavailable when endpoint omits it", () => {
      const noRestore = setup({ withoutRestore: true });
      expect(noRestore.ext.canRestoreSnapshot).toBe(false);
      expect(noRestore.ext.restoreSnapshot).toBeUndefined();
      noRestore.editor.unmount();
    });
  });

  // -------------------------------------------------------------------------
  // Updating snapshot names
  // -------------------------------------------------------------------------

  describe("updating snapshot names", () => {
    it("renames a snapshot in the store and backend", async () => {
      const snap = await ctx.seed("content", "Original");
      await ctx.ext.listSnapshots();

      await ctx.ext.updateSnapshotName!(snap.id, "Renamed");

      // Store was updated optimistically.
      expect(ctx.ext.store.state.snapshots[0]!.name).toBe("Renamed");

      // Backend was also updated (verified via listSnapshots).
      const list = await ctx.ext.listSnapshots();
      expect(list.find((s) => s.id === snap.id)!.name).toBe("Renamed");
    });

    it("reports name updates as unavailable when endpoint omits it", () => {
      const noUpdate = setup({ withoutUpdateName: true });
      expect(noUpdate.ext.canUpdateSnapshotName).toBe(false);
      expect(noUpdate.ext.updateSnapshotName).toBeUndefined();
      noUpdate.editor.unmount();
    });
  });

  // -------------------------------------------------------------------------
  // End-to-end workflow
  // -------------------------------------------------------------------------

  describe("workflow: create, preview with diff, then restore", () => {
    it("handles the full version-history flow", async () => {
      vi.useFakeTimers();

      // 1. Create version 1.
      setEditorText(ctx.editor, "doc v1");
      const v1 = await ctx.ext.createSnapshot({ name: "Version 1" });

      vi.advanceTimersByTime(1000);

      // 2. Modify and create version 2.
      setEditorText(ctx.editor, "doc v2");
      const v2 = await ctx.ext.createSnapshot({ name: "Version 2" });
      expect(ctx.ext.store.state.snapshots[0]!.id).toBe(v2.id);

      // 3. Preview v1 with diff comparison against v2.
      await ctx.ext.previewSnapshot(v1.id, { compareTo: v2.id });
      expect(getEditorText(ctx.editor)).toBe("doc v1");

      // 4. Restore v1.
      await ctx.ext.restoreSnapshot!(v1.id);
      expect(getEditorText(ctx.editor)).toBe("doc v1");
      expect(ctx.ext.store.state.previewedSnapshotId).toBeUndefined();

      vi.useRealTimers();
    });
  });
});
