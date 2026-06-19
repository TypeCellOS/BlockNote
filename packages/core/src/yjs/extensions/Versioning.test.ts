/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vite-plus/test";
import * as Y from "yjs";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { VersioningExtension } from "../../extensions/Versioning/index.js";
import type { VersioningEndpoints } from "../../extensions/Versioning/index.js";
import { withCollaboration } from "./index.js";
import { createYjsVersioningAdapter } from "./Versioning.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createCollabEditor() {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment("doc");

  const collaborationOptions = {
    fragment,
    user: { color: "#ff0000", name: "Test User" },
    provider: undefined,
  };

  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: collaborationOptions,
    }),
  );
  const div = document.createElement("div");
  editor.mount(div);

  return { editor, doc, fragment, collaborationOptions };
}

function getEditorText(editor: BlockNoteEditor<any, any, any>): string {
  return editor.prosemirrorState.doc.textContent;
}

function setEditorText(editor: BlockNoteEditor<any, any, any>, text: string) {
  editor.replaceBlocks(editor.document, [{ type: "paragraph", content: text }]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createYjsVersioningAdapter (Yjs v13, delegates to ForkYDocExtension)", () => {
  let ctx: ReturnType<typeof createCollabEditor>;

  afterEach(() => {
    ctx.editor.unmount();
    ctx.doc.destroy();
  });

  it("getCurrentState returns the live fragment", () => {
    ctx = createCollabEditor();
    const adapter = createYjsVersioningAdapter(
      ctx.editor,
      ctx.collaborationOptions,
    );
    const state = adapter.getCurrentState();
    expect(state.doc).toBe(ctx.doc);
  });

  it("enterPreview shows snapshot content, not live doc", () => {
    ctx = createCollabEditor();
    setEditorText(ctx.editor, "Version A");
    const snapshotUpdate = Y.encodeStateAsUpdate(ctx.doc);

    setEditorText(ctx.editor, "Version B");
    expect(getEditorText(ctx.editor)).toBe("Version B");

    const adapter = createYjsVersioningAdapter(
      ctx.editor,
      ctx.collaborationOptions,
    );
    adapter.preview.enterPreview(snapshotUpdate);
    expect(getEditorText(ctx.editor)).toBe("Version A");
  });

  it("exitPreview restores the live document", () => {
    ctx = createCollabEditor();
    setEditorText(ctx.editor, "Version A");
    const snapshotUpdate = Y.encodeStateAsUpdate(ctx.doc);

    setEditorText(ctx.editor, "Version B");

    const adapter = createYjsVersioningAdapter(
      ctx.editor,
      ctx.collaborationOptions,
    );
    adapter.preview.enterPreview(snapshotUpdate);
    expect(getEditorText(ctx.editor)).toBe("Version A");

    adapter.preview.exitPreview();
    expect(getEditorText(ctx.editor)).toBe("Version B");
  });

  it("successive enterPreview calls switch between snapshots", () => {
    ctx = createCollabEditor();

    // Create snapshot A
    setEditorText(ctx.editor, "Snapshot A");
    const snapshotA = Y.encodeStateAsUpdate(ctx.doc);

    // Create snapshot B
    setEditorText(ctx.editor, "Snapshot B");
    const snapshotB = Y.encodeStateAsUpdate(ctx.doc);

    // Move to different content
    setEditorText(ctx.editor, "Current");

    const adapter = createYjsVersioningAdapter(
      ctx.editor,
      ctx.collaborationOptions,
    );

    // Preview A
    adapter.preview.enterPreview(snapshotA);
    expect(getEditorText(ctx.editor)).toBe("Snapshot A");

    // Switch to preview B without explicitly exiting
    adapter.preview.enterPreview(snapshotB);
    expect(getEditorText(ctx.editor)).toBe("Snapshot B");

    // Exit should restore live doc
    adapter.preview.exitPreview();
    expect(getEditorText(ctx.editor)).toBe("Current");
  });

  it("switching previews does not introduce duplicate keyed plugins", () => {
    ctx = createCollabEditor();

    // Helper to find duplicate keyed plugins
    function getDuplicateKeys() {
      const plugins = ctx.editor.prosemirrorState.plugins;
      const keys = plugins
        .map((p: any) => p.spec?.key?.key)
        .filter(Boolean) as string[];
      return keys.filter((key, i) => keys.indexOf(key) !== i);
    }

    // Create two snapshots
    setEditorText(ctx.editor, "Snap A");
    const snapA = Y.encodeStateAsUpdate(ctx.doc);

    setEditorText(ctx.editor, "Snap B");
    const snapB = Y.encodeStateAsUpdate(ctx.doc);

    setEditorText(ctx.editor, "Live");

    const adapter = createYjsVersioningAdapter(
      ctx.editor,
      ctx.collaborationOptions,
    );

    // Baseline: no duplicates before any preview
    expect(getDuplicateKeys()).toEqual([]);

    // First preview (fork)
    adapter.preview.enterPreview(snapA);
    expect(getDuplicateKeys()).toEqual([]);
    expect(getEditorText(ctx.editor)).toBe("Snap A");

    // Switch directly to second preview (merge + fork)
    adapter.preview.enterPreview(snapB);
    expect(getDuplicateKeys()).toEqual([]);
    expect(getEditorText(ctx.editor)).toBe("Snap B");

    // Third switch
    adapter.preview.enterPreview(snapA);
    expect(getDuplicateKeys()).toEqual([]);
    expect(getEditorText(ctx.editor)).toBe("Snap A");

    // Exit and verify no duplicates remain
    adapter.preview.exitPreview();
    expect(getDuplicateKeys()).toEqual([]);
  });

  it("preview → exit → preview again does not duplicate keyed plugins", () => {
    ctx = createCollabEditor();

    // Helper to find duplicate keyed plugins
    function getDuplicateKeys() {
      const plugins = ctx.editor.prosemirrorState.plugins;
      const keys = plugins
        .map((p: any) => p.spec?.key?.key)
        .filter(Boolean) as string[];
      return keys.filter((key, i) => keys.indexOf(key) !== i);
    }

    setEditorText(ctx.editor, "Snap A");
    const snapA = Y.encodeStateAsUpdate(ctx.doc);

    setEditorText(ctx.editor, "Live");

    const adapter = createYjsVersioningAdapter(
      ctx.editor,
      ctx.collaborationOptions,
    );

    const pluginCountBefore = ctx.editor.prosemirrorState.plugins.length;

    // Preview
    adapter.preview.enterPreview(snapA);
    expect(getDuplicateKeys()).toEqual([]);

    // Exit back to live
    adapter.preview.exitPreview();
    expect(getDuplicateKeys()).toEqual([]);
    // Plugin count should be back to original
    expect(ctx.editor.prosemirrorState.plugins.length).toBe(pluginCountBefore);

    // Preview again — this is the exact flow that triggers the browser bug
    adapter.preview.enterPreview(snapA);
    expect(getDuplicateKeys()).toEqual([]);

    // Exit again
    adapter.preview.exitPreview();
    expect(getDuplicateKeys()).toEqual([]);
    expect(ctx.editor.prosemirrorState.plugins.length).toBe(pluginCountBefore);

    // One more round trip to be thorough
    adapter.preview.enterPreview(snapA);
    expect(getDuplicateKeys()).toEqual([]);
    adapter.preview.exitPreview();
    expect(getDuplicateKeys()).toEqual([]);
    expect(ctx.editor.prosemirrorState.plugins.length).toBe(pluginCountBefore);
  });

  it("applyRestore throws not-yet-implemented error", () => {
    ctx = createCollabEditor();
    const adapter = createYjsVersioningAdapter(
      ctx.editor,
      ctx.collaborationOptions,
    );
    expect(() => adapter.preview.applyRestore(new Uint8Array())).toThrow(
      /not yet implemented/i,
    );
  });

  it("exitPreview is a no-op when not previewing", () => {
    ctx = createCollabEditor();
    setEditorText(ctx.editor, "Content");

    const adapter = createYjsVersioningAdapter(
      ctx.editor,
      ctx.collaborationOptions,
    );

    // Should not throw
    adapter.preview.exitPreview();
    expect(getEditorText(ctx.editor)).toBe("Content");
  });

  it("throws when ForkYDocExtension is not registered", () => {
    // Create an editor with collaboration but without ForkYDocExtension.
    // We can't easily remove it from CollaborationExtension, but we can
    // create a minimal editor and pass the adapter directly.
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment("doc");
    const editor = BlockNoteEditor.create();
    const div = document.createElement("div");
    editor.mount(div);

    const adapter = createYjsVersioningAdapter(editor, {
      fragment,
      user: { name: "Test", color: "#000" },
      provider: undefined,
    });

    expect(() =>
      adapter.preview.enterPreview(Y.encodeStateAsUpdate(doc)),
    ).toThrow(/ForkYDocExtension/);

    editor.unmount();
    doc.destroy();
  });
});

// ---------------------------------------------------------------------------
// Helpers for integration tests
// ---------------------------------------------------------------------------

/**
 * Simple in-memory Yjs v13 versioning endpoints for tests.
 */
function createInMemoryYjsEndpoints(): VersioningEndpoints<
  Y.XmlFragment,
  Uint8Array
> {
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
      contents.set(snapshot.id, Y.encodeStateAsUpdate(fragment.doc!));
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
      const backup = {
        id: crypto.randomUUID(),
        name: "Backup",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      contents.set(backup.id, Y.encodeStateAsUpdate(fragment.doc!));
      snapshots.set(backup.id, backup);

      const snapshotContent = contents.get(id)!;
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

// ---------------------------------------------------------------------------
// Integration tests: VersioningExtension + Yjs v13 adapter
// ---------------------------------------------------------------------------

describe("Yjs v13 versioning integration (VersioningExtension + in-memory endpoints)", () => {
  function createCollabEditorWithVersioning() {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment("doc");

    const endpoints = createInMemoryYjsEndpoints();

    const collaborationOptions: import("./index.js").CollaborationOptions = {
      fragment,
      user: { name: "Test User", color: "#ff0000" },
      provider: undefined,
    };

    const editor = BlockNoteEditor.create(
      withCollaboration({
        collaboration: collaborationOptions,
        extensions: [
          VersioningExtension((ed) => ({
            ...createYjsVersioningAdapter(ed, collaborationOptions),
            endpoints,
          })),
        ],
      }),
    );

    const div = document.createElement("div");
    editor.mount(div);

    return { editor, doc, fragment, endpoints };
  }

  let ctx2: ReturnType<typeof createCollabEditorWithVersioning>;

  afterEach(() => {
    ctx2.editor.unmount();
    ctx2.doc.destroy();
  });

  it("previews a snapshot, showing old content", async () => {
    ctx2 = createCollabEditorWithVersioning();
    const versioning = ctx2.editor.getExtension(VersioningExtension)!;

    setEditorText(ctx2.editor, "Snapshot content");
    const snap = await versioning.createSnapshot!({ name: "v1" });

    setEditorText(ctx2.editor, "Current content");

    await versioning.previewSnapshot(snap.id);
    expect(versioning.store.state.previewedSnapshotId).toBe(snap.id);
    expect(getEditorText(ctx2.editor)).toBe("Snapshot content");
  });

  it("exits preview and returns to live document", async () => {
    ctx2 = createCollabEditorWithVersioning();
    const versioning = ctx2.editor.getExtension(VersioningExtension)!;

    setEditorText(ctx2.editor, "Saved state");
    const snap = await versioning.createSnapshot!({ name: "v1" });

    setEditorText(ctx2.editor, "Live state");

    await versioning.previewSnapshot(snap.id);
    versioning.exitPreview();

    expect(getEditorText(ctx2.editor)).toBe("Live state");
    expect(versioning.store.state.previewedSnapshotId).toBeUndefined();
  });

  it("full workflow: create multiple versions, preview, switch, exit", async () => {
    ctx2 = createCollabEditorWithVersioning();
    const versioning = ctx2.editor.getExtension(VersioningExtension)!;

    // Create two versions
    setEditorText(ctx2.editor, "Version 1");
    const v1 = await versioning.createSnapshot!({ name: "v1" });

    setEditorText(ctx2.editor, "Version 2");
    const v2 = await versioning.createSnapshot!({ name: "v2" });

    setEditorText(ctx2.editor, "Current state");

    // List
    const list = await versioning.listSnapshots();
    expect(list).toHaveLength(2);

    // Preview older, then switch to newer
    await versioning.previewSnapshot(v1.id);
    expect(getEditorText(ctx2.editor)).toBe("Version 1");

    await versioning.previewSnapshot(v2.id);
    expect(getEditorText(ctx2.editor)).toBe("Version 2");

    // Exit back to live
    versioning.exitPreview();
    expect(getEditorText(ctx2.editor)).toBe("Current state");
  });

  it("preview → preview → exit → preview does not crash (keyed plugin collision)", async () => {
    ctx2 = createCollabEditorWithVersioning();
    const versioning = ctx2.editor.getExtension(VersioningExtension)!;

    // Helper to find duplicate keyed plugins
    function getDuplicateKeys() {
      const plugins = ctx2.editor.prosemirrorState.plugins;
      const keys = plugins
        .map((p: any) => p.spec?.key?.key)
        .filter(Boolean) as string[];
      return keys.filter((key, i) => keys.indexOf(key) !== i);
    }

    // Create two versions
    setEditorText(ctx2.editor, "Version 1");
    const v1 = await versioning.createSnapshot!({ name: "v1" });

    setEditorText(ctx2.editor, "Version 2");
    const v2 = await versioning.createSnapshot!({ name: "v2" });

    setEditorText(ctx2.editor, "Current state");

    const pluginCountBefore = ctx2.editor.prosemirrorState.plugins.length;

    // preview
    await versioning.previewSnapshot(v1.id);
    expect(getEditorText(ctx2.editor)).toBe("Version 1");
    expect(getDuplicateKeys()).toEqual([]);

    // preview (switch)
    await versioning.previewSnapshot(v2.id);
    expect(getEditorText(ctx2.editor)).toBe("Version 2");
    expect(getDuplicateKeys()).toEqual([]);

    // exit
    versioning.exitPreview();
    expect(getEditorText(ctx2.editor)).toBe("Current state");
    expect(getDuplicateKeys()).toEqual([]);
    expect(ctx2.editor.prosemirrorState.plugins.length).toBe(pluginCountBefore);

    // preview again — this is the sequence that triggers the browser crash
    await versioning.previewSnapshot(v1.id);
    expect(getEditorText(ctx2.editor)).toBe("Version 1");
    expect(getDuplicateKeys()).toEqual([]);
  });

  it("preview → exit → edit → snapshot → preview new snapshot (exact user-reported flow)", async () => {
    ctx2 = createCollabEditorWithVersioning();
    const versioning = ctx2.editor.getExtension(VersioningExtension)!;

    // Helper to find duplicate keyed plugins
    function getDuplicateKeys() {
      const plugins = ctx2.editor.prosemirrorState.plugins;
      const keys = plugins
        .map((p: any) => p.spec?.key?.key)
        .filter(Boolean) as string[];
      return keys.filter((key, i) => keys.indexOf(key) !== i);
    }

    // Step 1: Create initial content and snapshot
    setEditorText(ctx2.editor, "Version 1");
    const v1 = await versioning.createSnapshot!({ name: "v1" });

    setEditorText(ctx2.editor, "Current state");

    // Step 2: Preview the snapshot
    await versioning.previewSnapshot(v1.id);
    expect(getEditorText(ctx2.editor)).toBe("Version 1");
    expect(getDuplicateKeys()).toEqual([]);

    // Step 3: Exit back to live
    versioning.exitPreview();
    expect(getEditorText(ctx2.editor)).toBe("Current state");
    expect(getDuplicateKeys()).toEqual([]);

    // Step 4: EDIT the document (this is the key difference from previous tests)
    setEditorText(ctx2.editor, "Edited after preview");

    // Step 5: Create a NEW snapshot of the edited content
    const v2 = await versioning.createSnapshot!({ name: "v2" });

    // Step 6: Preview the NEW snapshot — this is where the browser crash happened
    // before the replaceExtension fix (y-prosemirror's view hooks would dispatch
    // a transaction between separate unregister/register calls, re-introducing
    // stale y-sync$ plugins).
    await versioning.previewSnapshot(v2.id);
    expect(getEditorText(ctx2.editor)).toBe("Edited after preview");
    expect(getDuplicateKeys()).toEqual([]);

    // Clean exit
    versioning.exitPreview();
    expect(getDuplicateKeys()).toEqual([]);
  });
});
