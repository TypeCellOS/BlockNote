import { BlockNoteEditor } from "@blocknote/core";
import { createVersioningExtension } from "@blocknote/core/extensions";
import {
  blocksToYDoc,
  createYVersionView,
  withCollaboration,
} from "@blocknote/core/y";
import { Awareness } from "@y/protocols/awareness";
import * as Y from "@y/y";
import { expect, test } from "vite-plus/test";

// Node tests cover session ownership, paused plugin state, races, and cursor
// identity. This test needs actual binding and focus listeners, not just state.
test("a mounted preview ignores remote edits and cannot publish live cursors", async () => {
  const schemaEditor = BlockNoteEditor.create();
  const doc = blocksToYDoc(
    schemaEditor,
    [{ id: "paragraph", type: "paragraph", content: "Original" }],
    "doc",
  );
  const awareness = new Awareness(doc);
  const saved = Y.encodeStateAsUpdateV2(doc);
  const Versions = createVersioningExtension((editor) => ({
    adapter: createYVersionView(editor, doc.get("doc")),
    storage: {
      list: async () => [{ id: "saved", createdAt: 1 }],
      getContent: async () => saved,
    },
  }));
  const div = document.createElement("div");
  const remoteDiv = document.createElement("div");
  document.body.append(div, remoteDiv);
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment: doc.get("doc"),
        provider: { awareness },
        user: { name: "Local", color: "red" },
      },
      extensions: [Versions()],
    }),
  );
  const remote = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment: doc.get("doc"),
        provider: undefined,
        user: { name: "Remote", color: "blue" },
      },
    }),
  );
  const versioning = editor.getExtension(Versions)!;
  try {
    editor.mount(div);
    remote.mount(remoteDiv);
    editor.setTextCursorPosition("paragraph", "end");
    editor.focus();
    await expect
      .poll(() => awareness.getLocalState()?.cursor != null)
      .toBe(true);
    // The listing stage has no rendered snapshot yet. Real focus listeners
    // must already be detached, including after the view is remounted.
    versioning.open();
    editor.focus();
    editor.setTextCursorPosition("paragraph", "start");
    expect(awareness.getLocalState()?.cursor).toBeNull();
    remote.updateBlock("paragraph", { content: "Arrived during listing" });
    await expect.poll(() => Y.encodeStateAsUpdateV2(doc)).not.toEqual(saved);
    expect(editor.prosemirrorView.dom.textContent).toContain("Original");
    await versioning.list();
    await versioning.select({ type: "current" });
    // Focus the actual editor while isolated. Its cursor plugin must not send
    // preview positions to other collaborators.
    editor.focus();
    editor.setTextCursorPosition("paragraph", "start");
    expect(awareness.getLocalState()?.cursor).toBeNull();
    remote.updateBlock("paragraph", { content: "Remote edit" });
    await expect
      .poll(() => remote.prosemirrorView.dom.textContent)
      .toContain("Remote edit");
    expect(editor.prosemirrorView.dom.textContent).toContain("Original");
    await versioning.select({ type: "snapshot", id: "saved" });
    editor.focus();
    editor.setTextCursorPosition("paragraph", "end");
    expect(awareness.getLocalState()?.cursor).toBeNull();
    // Programmatic changes bypass read-only, but still must not reach the doc.
    editor.updateBlock("paragraph", { content: "Preview-only edit" });
    expect(remote.prosemirrorView.dom.textContent).toContain("Remote edit");
    versioning.close();
    await expect
      .poll(() => editor.prosemirrorView.dom.textContent)
      .toContain("Remote edit");
    editor.focus();
    editor.setTextCursorPosition("paragraph", "end");
    await expect
      .poll(() => awareness.getLocalState()?.cursor != null)
      .toBe(true);
  } finally {
    versioning.close();
    editor.unmount();
    remote.unmount();
    editor._tiptapEditor.destroy();
    remote._tiptapEditor.destroy();
    schemaEditor._tiptapEditor.destroy();
    awareness.destroy();
    doc.destroy();
    div.remove();
    remoteDiv.remove();
  }
});
