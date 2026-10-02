/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vite-plus/test";
import { configureYProsemirror } from "@y/prosemirror";
import * as Y from "@y/y";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { withCollaboration } from "./index.js";
import { showSnapshotPreview } from "./snapshotPreview.js";

/** Collaborative editor without versioning — the preview modules under test. */
function createPreviewEditor() {
  const doc = new Y.Doc();
  const fragment = doc.get("doc");
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment,
        user: { name: "Preview Test", color: "#0000ff" },
        provider: undefined,
      },
    }),
  );
  editor.mount(document.createElement("div"));
  return { editor, doc, fragment };
}

function getEditorText(editor: BlockNoteEditor<any, any, any>): string {
  return editor.prosemirrorState.doc.textContent;
}

function attributionMarkNames(
  editor: BlockNoteEditor<any, any, any>,
): Set<string> {
  const names = new Set<string>();
  editor.prosemirrorState.doc.descendants((node) => {
    node.marks.forEach((m) => {
      if (m.type.name.startsWith("y-attributed-")) {
        names.add(m.type.name);
      }
    });
    return true;
  });
  return names;
}

/** Rebind the live fragment, as the versioning adapter does when leaving a preview. */
function rebindLive(editor: BlockNoteEditor<any, any, any>, fragment: Y.Node) {
  editor.exec(configureYProsemirror({ ytype: fragment }));
}

describe("snapshot preview switching", () => {
  let ctx: ReturnType<typeof createPreviewEditor>;

  afterEach(() => {
    if (ctx) {
      ctx.editor.unmount();
      ctx.doc.destroy();
    }
  });

  it("rebinding live restores the document shown before a preview", () => {
    ctx = createPreviewEditor();
    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Live state" },
    ]);
    const snapshot = Y.encodeStateAsUpdateV2(ctx.doc);
    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Other state" },
    ]);

    // Previewing the older snapshot swaps the screen away from live.
    showSnapshotPreview(ctx.editor, ctx.fragment, snapshot);
    expect(getEditorText(ctx.editor)).toContain("Live state");

    // The live Y.Doc still holds "Other state" (the preview renders a decoded
    // copy); rebinding re-syncs the editor back to it.
    rebindLive(ctx.editor, ctx.fragment);
    expect(getEditorText(ctx.editor)).toContain("Other state");
  });

  it("successive previews switch content without touching the live doc", () => {
    ctx = createPreviewEditor();
    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Version 1" },
    ]);
    const v1 = Y.encodeStateAsUpdateV2(ctx.doc);
    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Version 2" },
    ]);
    const v2 = Y.encodeStateAsUpdateV2(ctx.doc);

    showSnapshotPreview(ctx.editor, ctx.fragment, v1);
    expect(getEditorText(ctx.editor)).toContain("Version 1");

    showSnapshotPreview(ctx.editor, ctx.fragment, v2);
    expect(getEditorText(ctx.editor)).toContain("Version 2");

    // The Y.Doc kept the last live state ("Version 2"), so rebinding shows it.
    rebindLive(ctx.editor, ctx.fragment);
    expect(getEditorText(ctx.editor)).toContain("Version 2");
  });
});

describe("showSnapshotPreview", () => {
  let ctx: ReturnType<typeof createPreviewEditor>;

  afterEach(() => {
    if (ctx) {
      ctx.editor.unmount();
      ctx.doc.destroy();
    }
  });

  it("renders snapshot content without a baseline", () => {
    ctx = createPreviewEditor();
    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Original content" },
    ]);
    const snapshot = Y.encodeStateAsUpdateV2(ctx.doc);
    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Modified content" },
    ]);

    showSnapshotPreview(ctx.editor, ctx.fragment, snapshot);

    expect(getEditorText(ctx.editor)).toContain("Original content");
    expect(getEditorText(ctx.editor)).not.toContain("Modified");
  });

  it("renders insert/delete marks when diffed against a baseline", () => {
    ctx = createPreviewEditor();
    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "the quick brown fox" },
    ]);
    const baseline = Y.encodeStateAsUpdateV2(ctx.doc);
    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "the slow brown fox jumps" },
    ]);
    const snapshot = Y.encodeStateAsUpdateV2(ctx.doc);

    showSnapshotPreview(ctx.editor, ctx.fragment, snapshot, baseline);

    const names = attributionMarkNames(ctx.editor);
    expect(names.has("y-attributed-insert")).toBe(true);
    expect(names.has("y-attributed-delete")).toBe(true);
    expect(getEditorText(ctx.editor)).toContain("slow");
  });

  it("switches between successive previews", () => {
    ctx = createPreviewEditor();
    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Snapshot A" },
    ]);
    const snapshotA = Y.encodeStateAsUpdateV2(ctx.doc);
    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Snapshot B" },
    ]);
    const snapshotB = Y.encodeStateAsUpdateV2(ctx.doc);
    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Current" },
    ]);

    showSnapshotPreview(ctx.editor, ctx.fragment, snapshotA);
    expect(getEditorText(ctx.editor)).toContain("Snapshot A");

    showSnapshotPreview(ctx.editor, ctx.fragment, snapshotB);
    expect(getEditorText(ctx.editor)).toContain("Snapshot B");
  });

  it("leaves the live document untouched when the snapshot is corrupt", () => {
    ctx = createPreviewEditor();
    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Live content" },
    ]);
    const baseline = Y.encodeStateAsUpdateV2(ctx.doc);

    expect(() =>
      showSnapshotPreview(
        ctx.editor,
        ctx.fragment,
        new Uint8Array([255, 255, 255]),
        baseline,
      ),
    ).toThrow();
    expect(getEditorText(ctx.editor)).toContain("Live content");
  });
});
