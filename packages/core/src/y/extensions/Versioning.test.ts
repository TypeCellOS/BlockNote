/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vite-plus/test";
import * as Y from "@y/y";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { VersioningExtension } from "../../extensions/Versioning/index.js";
import type { VersioningEndpoints } from "../../extensions/Versioning/index.js";
import { withCollaboration } from "./index.js";
import { createYjsVersioningAdapter } from "./Versioning.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simple in-memory Yjs versioning endpoints for tests.
 * Stores snapshots and their binary content in plain Maps.
 */
function createInMemoryYjsEndpoints(): VersioningEndpoints<Y.Type, Uint8Array> {
  const snapshots = new Map<
    string,
    {
      id: string;
      name?: string;
      createdAt: number;
      updatedAt: number;
      restoredFromSnapshotId?: string;
    }
  >();
  const contents = new Map<string, Uint8Array>();

  return {
    list: async () =>
      [...snapshots.values()].sort((a, b) => b.createdAt - a.createdAt),
    create: async (fragment, options) => {
      const snapshot = {
        id: crypto.randomUUID(),
        name: options?.name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        restoredFromSnapshotId: options?.restoredFromSnapshotId,
      };
      contents.set(snapshot.id, Y.encodeStateAsUpdateV2(fragment.doc!));
      snapshots.set(snapshot.id, snapshot);
      return snapshot;
    },
    getContent: async (id) => {
      const data = contents.get(id);
      if (!data) {
        throw new Error(`Snapshot ${id} not found`);
      }
      return data;
    },
    restore: async (fragment, id) => {
      // Create backup
      const backup = {
        id: crypto.randomUUID(),
        name: "Backup",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      contents.set(backup.id, Y.encodeStateAsUpdateV2(fragment.doc!));
      snapshots.set(backup.id, backup);

      const snapshotContent = contents.get(id)!;
      const tempDoc = new Y.Doc();
      Y.applyUpdateV2(tempDoc, snapshotContent);

      const restored = {
        id: crypto.randomUUID(),
        name: "Restored Snapshot",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        restoredFromSnapshotId: id,
      };
      contents.set(restored.id, Y.encodeStateAsUpdateV2(tempDoc));
      snapshots.set(restored.id, restored);
      tempDoc.destroy();

      return snapshotContent;
    },
    updateSnapshotName: async (id, name) => {
      const s = snapshots.get(id);
      if (!s) {
        throw new Error(`Snapshot ${id} not found`);
      }
      s.name = name;
      s.updatedAt = Date.now();
    },
  };
}

/** Create a collaborative editor with versioning, mounted to a jsdom div. */
function createCollabEditor(opts?: { withVersioning?: boolean }) {
  const doc = new Y.Doc();
  const fragment = doc.get("doc");
  const endpoints = createInMemoryYjsEndpoints();

  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment,
        user: { name: "Test User", color: "#ff0000" },
        provider: undefined,
        versioningEndpoints:
          opts?.withVersioning !== false ? endpoints : undefined,
      },
    }),
  );

  const div = document.createElement("div");
  editor.mount(div);

  return { editor, doc, fragment, endpoints };
}

/** Clean up an editor and its Y.Doc. */
function cleanup(ctx: { editor: BlockNoteEditor<any, any, any>; doc: Y.Doc }) {
  ctx.editor.unmount();
  ctx.doc.destroy();
}

/** Get the editor's current ProseMirror doc text content. */
function getEditorText(editor: BlockNoteEditor<any, any, any>): string {
  return editor.prosemirrorState.doc.textContent;
}

// ---------------------------------------------------------------------------
// Tests: createYjsVersioningAdapter (unit-level)
// ---------------------------------------------------------------------------

describe("createYjsVersioningAdapter", () => {
  let ctx: ReturnType<typeof createCollabEditor>;

  afterEach(() => {
    if (ctx) {
      cleanup(ctx);
    }
  });

  it("getCurrentState returns the fragment passed to the adapter", () => {
    ctx = createCollabEditor();
    const adapter = createYjsVersioningAdapter(ctx.editor, ctx.fragment);
    const state = adapter.getCurrentState();

    expect(state).toBe(ctx.fragment);
    expect(state.doc).toBe(ctx.doc);
  });

  it("enterPreview reconfigures the editor to show snapshot content", () => {
    ctx = createCollabEditor();

    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Original content" },
    ]);
    const snapshotData = Y.encodeStateAsUpdateV2(ctx.doc);

    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Modified content" },
    ]);

    const adapter = createYjsVersioningAdapter(ctx.editor, ctx.fragment);
    adapter.preview.enterPreview(snapshotData);

    expect(getEditorText(ctx.editor)).toContain("Original content");
    expect(getEditorText(ctx.editor)).not.toContain("Modified");
  });

  it("exitPreview resumes sync, showing the live document", () => {
    ctx = createCollabEditor();

    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Snapshot state" },
    ]);
    const snapshotData = Y.encodeStateAsUpdateV2(ctx.doc);

    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Current state" },
    ]);

    const adapter = createYjsVersioningAdapter(ctx.editor, ctx.fragment);
    adapter.preview.enterPreview(snapshotData);
    expect(getEditorText(ctx.editor)).toContain("Snapshot state");

    adapter.preview.exitPreview();
    expect(getEditorText(ctx.editor)).toContain("Current state");
  });

  it("successive enterPreview calls switch between snapshots", () => {
    ctx = createCollabEditor();

    // Create snapshot A
    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Snapshot A" },
    ]);
    const snapshotA = Y.encodeStateAsUpdateV2(ctx.doc);

    // Create snapshot B
    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Snapshot B" },
    ]);
    const snapshotB = Y.encodeStateAsUpdateV2(ctx.doc);

    // Move to current content
    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Current" },
    ]);

    const adapter = createYjsVersioningAdapter(ctx.editor, ctx.fragment);

    // Preview A
    adapter.preview.enterPreview(snapshotA);
    expect(getEditorText(ctx.editor)).toContain("Snapshot A");

    // Switch to B without exiting first
    adapter.preview.enterPreview(snapshotB);
    expect(getEditorText(ctx.editor)).toContain("Snapshot B");

    // Exit should restore the live doc
    adapter.preview.exitPreview();
    expect(getEditorText(ctx.editor)).toContain("Current");
  });

  it("exitPreview is a no-op when not previewing", () => {
    ctx = createCollabEditor();
    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Content" },
    ]);

    const adapter = createYjsVersioningAdapter(ctx.editor, ctx.fragment);

    // Should not throw or change anything
    adapter.preview.exitPreview();
    expect(getEditorText(ctx.editor)).toContain("Content");
  });

  it("applyRestore throws not-yet-implemented error", () => {
    ctx = createCollabEditor();
    const adapter = createYjsVersioningAdapter(ctx.editor, ctx.fragment);
    expect(() => adapter.preview.applyRestore(new Uint8Array())).toThrow(
      /not yet implemented/i,
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: Full integration with VersioningExtension + localStorageEndpoints
// ---------------------------------------------------------------------------

describe("Yjs versioning integration (VersioningExtension + in-memory endpoints)", () => {
  let ctx: ReturnType<typeof createCollabEditor>;

  afterEach(() => {
    if (ctx) {
      cleanup(ctx);
    }
  });

  it("previews a snapshot, showing the old content in the editor", async () => {
    ctx = createCollabEditor();
    const versioning = ctx.editor.getExtension(VersioningExtension)!;

    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Snapshot content" },
    ]);
    const snapshot = await versioning.createSnapshot({ name: "v1" });

    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Current content" },
    ]);

    await versioning.previewSnapshot(snapshot.id);

    expect(versioning.store.state.previewedSnapshotId).toBe(snapshot.id);
    expect(getEditorText(ctx.editor)).toContain("Snapshot content");
    expect(getEditorText(ctx.editor)).not.toContain("Current");
  });

  it("exits preview and returns to live document", async () => {
    ctx = createCollabEditor();
    const versioning = ctx.editor.getExtension(VersioningExtension)!;

    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Saved state" },
    ]);
    const snapshot = await versioning.createSnapshot({ name: "v1" });

    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Live state" },
    ]);

    await versioning.previewSnapshot(snapshot.id);
    versioning.exitPreview();

    expect(getEditorText(ctx.editor)).toContain("Live state");
  });

  it("full workflow: create, browse, preview, exit", async () => {
    ctx = createCollabEditor();
    const versioning = ctx.editor.getExtension(VersioningExtension)!;

    // Create two versions
    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Version 1" },
    ]);
    const v1 = await versioning.createSnapshot({ name: "v1" });

    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Version 2" },
    ]);
    const v2 = await versioning.createSnapshot({ name: "v2" });

    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Current state" },
    ]);

    // List and verify ordering
    const list = await versioning.listSnapshots();
    expect(list).toHaveLength(2);
    expect(list[0]!.id).toBe(v2.id);

    // Browse previews
    await versioning.previewSnapshot(v1.id);
    expect(getEditorText(ctx.editor)).toContain("Version 1");

    await versioning.previewSnapshot(v2.id, { compareTo: v1.id });
    expect(getEditorText(ctx.editor).length).toBeGreaterThan(0);

    // Exit back to live
    versioning.exitPreview();
    expect(getEditorText(ctx.editor)).toContain("Current state");
  });

  it("restoreSnapshot rejects because applyRestore is not yet implemented", async () => {
    ctx = createCollabEditor();
    const versioning = ctx.editor.getExtension(VersioningExtension)!;

    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Content" },
    ]);
    const snap = await versioning.createSnapshot({ name: "v1" });

    await expect(versioning.restoreSnapshot!(snap.id)).rejects.toThrow(
      /not yet implemented/i,
    );
  });

  it("previewing multiple snapshots and switching between them", async () => {
    ctx = createCollabEditor();
    const versioning = ctx.editor.getExtension(VersioningExtension)!;

    // Create three versions at different points
    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Version 1" },
    ]);
    const v1 = await versioning.createSnapshot({ name: "v1" });

    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Version 2" },
    ]);
    const v2 = await versioning.createSnapshot({ name: "v2" });

    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Version 3" },
    ]);
    await versioning.createSnapshot({ name: "v3" });

    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Current live" },
    ]);

    // Preview older, then newer
    await versioning.previewSnapshot(v1.id);
    expect(getEditorText(ctx.editor)).toContain("Version 1");

    await versioning.previewSnapshot(v2.id);
    expect(getEditorText(ctx.editor)).toContain("Version 2");
    expect(versioning.store.state.previewedSnapshotId).toBe(v2.id);

    // Exit back to live
    versioning.exitPreview();
    expect(getEditorText(ctx.editor)).toContain("Current live");
  });
});
