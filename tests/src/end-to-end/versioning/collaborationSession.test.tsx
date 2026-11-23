import { createVersioningExtension } from "@blocknote/core/extensions";
import {
  blocksToYDoc,
  createYVersionView,
  withCollaboration,
  yDocToBlocks,
} from "@blocknote/core/y";
import { Awareness } from "@y/protocols/awareness";
import * as Y from "@y/y";
import { expect } from "vite-plus/test";

// Node tests cover session ownership, paused plugin state, races, and cursor
// identity. This test needs actual binding and focus listeners, not just state.
it("a mounted preview ignores remote edits and cannot publish live cursors", async ({
  onTestFinished,
  setupEditor,
}) => {
  const { editor: schemaEditor } = await setupEditor({ mountType: false });
  const doc = blocksToYDoc(
    schemaEditor,
    [{ id: "paragraph", type: "paragraph", content: "Original" }],
    "doc",
  );
  // Finish hooks run in reverse order, so the mounted-editor fixtures unmount
  // before awareness and the doc are destroyed, even if mounting fails.
  onTestFinished(() => doc.destroy());
  const fragment = doc.get("doc");
  function sharedContent() {
    return yDocToBlocks(schemaEditor, doc, "doc").find(
      (block) => block.id === "paragraph",
    )?.content;
  }
  function text(value: string) {
    return [{ type: "text", text: value, styles: {} }];
  }
  const awareness = new Awareness(doc);
  onTestFinished(() => awareness.destroy());
  const saved = Y.encodeStateAsUpdateV2(doc);
  const Versions = createVersioningExtension((editor) => ({
    adapter: createYVersionView(editor, fragment),
    storage: {
      list: async () => ({
        ok: true,
        value: { snapshots: [{ id: "saved", createdAt: 1 }] },
      }),
      getContent: async () => ({ ok: true, value: saved }),
    },
  }));
  const { editor } = await setupEditor({
    mountType: "dom",
    ...withCollaboration({
      collaboration: {
        fragment,
        provider: { awareness },
        user: { name: "Local", color: "red" },
      },
      extensions: [Versions()],
    }),
  });
  const { editor: remote } = await setupEditor({
    mountType: "dom",
    ...withCollaboration({
      extensions: [],
      collaboration: {
        fragment,
        provider: undefined,
        user: { name: "Remote", color: "blue" },
      },
    }),
  });
  const versioning = editor.getExtension(Versions)!;
  try {
    editor.setTextCursorPosition("paragraph", "end");
    editor.focus();
    await expect
      .poll(() => awareness.getLocalState()?.cursor != null)
      .toBe(true);
    // The listing stage has no rendered snapshot yet. Real focus listeners
    // must already be detached, including after the view is remounted.
    // Exercise the setup/cleanup/setup sequence used by StrictMode effects
    // against a real mounted collaboration binding, not only a fake adapter.
    versioning.open();
    versioning.close();
    versioning.open();
    editor.focus();
    editor.setTextCursorPosition("paragraph", "start");
    expect(awareness.getLocalState()?.cursor).toBeNull();
    remote.updateBlock("paragraph", { content: "Arrived during listing" });
    await expect.poll(sharedContent).toEqual(text("Arrived during listing"));
    expect(editor.domElement?.textContent).toBe("Original");
    await versioning.list();
    await versioning.select({ type: "current" });
    // Focus the actual editor while isolated. Its cursor plugin must not send
    // preview positions to other collaborators.
    editor.focus();
    editor.setTextCursorPosition("paragraph", "start");
    expect(awareness.getLocalState()?.cursor).toBeNull();
    remote.updateBlock("paragraph", { content: "Remote edit" });
    await expect.poll(sharedContent).toEqual(text("Remote edit"));
    expect(remote.domElement?.textContent).toBe("Remote edit");
    expect(editor.domElement?.textContent).toBe("Original");
    await versioning.select({ type: "snapshot", id: "saved" });
    editor.focus();
    editor.setTextCursorPosition("paragraph", "end");
    expect(awareness.getLocalState()?.cursor).toBeNull();
    // Programmatic changes bypass read-only, but still must not reach the doc.
    const beforePreviewEdit = Y.encodeStateAsUpdateV2(doc);
    editor.updateBlock("paragraph", { content: "Preview-only edit" });
    expect(editor.getBlock("paragraph")?.content).toEqual(
      text("Preview-only edit"),
    );
    expect(Y.encodeStateAsUpdateV2(doc)).toEqual(beforePreviewEdit);
    expect(remote.domElement?.textContent).toBe("Remote edit");
    versioning.close();
    await expect.poll(() => editor.domElement?.textContent).toBe("Remote edit");
    expect(Y.encodeStateAsUpdateV2(doc)).toEqual(beforePreviewEdit);
    editor.focus();
    editor.setTextCursorPosition("paragraph", "end");
    await expect
      .poll(() => awareness.getLocalState()?.cursor != null)
      .toBe(true);
  } finally {
    versioning.close();
  }
});
