/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vite-plus/test";
import * as Y from "@y/y";
import * as Y1 from "yjs";
import { prosemirrorToYXmlFragment } from "y-prosemirror";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { withCollaboration } from "./index.js";
import { decodeFragmentUpdate } from "./snapshotCodec.js";
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

/**
 * Writes two prosemirror documents (at two points in time) into a single
 * yjs v13 document using the old y-prosemirror binding, returning the two
 * resulting state updates. Reusing one Y.Doc keeps both snapshots in the
 * same ID space, so the new binding can diff them by ID.
 */
function buildV1Snapshots(editor: BlockNoteEditor<any, any, any>): {
  baseline: Uint8Array;
  snapshot: Uint8Array;
} {
  editor.replaceBlocks(editor.document, [
    { type: "paragraph", content: "Version 1" },
  ]);
  const pmDoc1 = editor.prosemirrorState.doc;

  const legacyDoc = new Y1.Doc();
  const legacyFragment = legacyDoc.get("doc", Y1.XmlFragment);
  prosemirrorToYXmlFragment(pmDoc1, legacyFragment);
  const baseline = Y1.encodeStateAsUpdateV2(legacyDoc);

  editor.replaceBlocks(editor.document, [
    { type: "paragraph", content: "Version 2" },
  ]);
  const pmDoc2 = editor.prosemirrorState.doc;
  prosemirrorToYXmlFragment(pmDoc2, legacyFragment);
  const snapshot = Y1.encodeStateAsUpdateV2(legacyDoc);

  return { baseline, snapshot };
}

describe("v1 binding snapshot diff", () => {
  let ctx: ReturnType<typeof createPreviewEditor>;

  afterEach(() => {
    if (ctx) {
      ctx.editor.unmount();
      ctx.doc.destroy();
    }
  });

  it("decodes a v1-shaped update into the nested anonymous node layout", () => {
    ctx = createPreviewEditor();
    const { baseline } = buildV1Snapshots(ctx.editor);

    const decoded = decodeFragmentUpdate(ctx.fragment, baseline);
    try {
      const tree = JSON.stringify(decoded.fragment.toDelta());
      expect(tree).toContain('"name":"blockGroup"');
      expect(tree).toContain('"name":"paragraph"');
      expect(tree).not.toContain('"name":null');
      expect(tree).toMatch(
        /"paragraph","children":\[\{"children":\["Version 1"\]/,
      );
    } finally {
      decoded.doc.destroy();
    }
  });

  it("diffs two v1-shaped snapshots through the new binding", () => {
    ctx = createPreviewEditor();
    const { baseline, snapshot } = buildV1Snapshots(ctx.editor);

    let errorMessage: string | undefined;
    try {
      showSnapshotPreview(ctx.editor, ctx.fragment, snapshot, baseline);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }
    expect(errorMessage).toBe("[y/prosemirror]: failed to create node: null");
  });

  it("rejects a genuine V1-format update in the new binding", () => {
    ctx = createPreviewEditor();
    ctx.editor.replaceBlocks(ctx.editor.document, [
      { type: "paragraph", content: "Version 1" },
    ]);
    const legacyDoc = new Y1.Doc();
    const legacyFragment = legacyDoc.get("doc", Y1.XmlFragment);
    prosemirrorToYXmlFragment(ctx.editor.prosemirrorState.doc, legacyFragment);
    const v1FormatUpdate = Y1.encodeStateAsUpdate(legacyDoc);

    let errorMessage: string | undefined;
    try {
      decodeFragmentUpdate(ctx.fragment, v1FormatUpdate);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }
    expect(errorMessage).toMatch(/^RangeError: Invalid typed array length/);
  });
});
