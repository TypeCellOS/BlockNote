// @vitest-environment node
import * as Y from "yjs";
import { ySyncPluginKey } from "y-prosemirror";
import { expect, it } from "vite-plus/test";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { withCollaboration } from "./index.js";
import { blocksToYXmlFragment } from "../utils.js";
import {
  createVersioningExtension,
  type VersioningController,
} from "../../extensions/Versioning/Versioning.js";
import { createYjsVersionView, YjsVersioningExtension } from "./Versioning.js";
import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";

it("keeps the live fragment separate while replacing snapshots in its fork", async () => {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment("doc");
  let saved: Uint8Array = new Uint8Array();
  const editor = BlockNoteEditor.create(
    withCollaboration({
      extensions: [
        YjsVersioningExtension({
          storage: {
            list: async () => ({
              ok: true,
              value: [{ id: "saved", createdAt: 1 }],
            }),
            getContent: async () => ({ ok: true, value: saved }),
          },
        }),
      ],
      collaboration: { fragment, user: { name: "Test", color: "red" } },
    }),
  );
  editor.replaceBlocks(editor.document, [
    { type: "paragraph", content: "Captured" },
  ]);
  blocksToYXmlFragment(editor, editor.document, fragment);
  saved = Y.encodeStateAsUpdate(doc);
  editor.prosemirrorView.updateState(
    editor.prosemirrorState.reconfigure({
      plugins: editor._tiptapEditor.extensionManager.plugins,
    }),
  );
  const mode = editor.getExtension<VersioningController>("versioning")!;
  try {
    mode.open();
    expect(editor.isEditable).toBe(false);
    expect(await mode.list()).toEqual({ status: "done" });
    expect(ySyncPluginKey.getState(editor.prosemirrorState)?.type).not.toBe(
      fragment,
    );
    const latest = BlockNoteEditor.create();
    try {
      latest.replaceBlocks(latest.document, [
        { type: "paragraph", content: "Remote latest" },
      ]);
      blocksToYXmlFragment(latest, latest.document, fragment);
    } finally {
      latest._tiptapEditor.destroy();
    }
    const remoteContent = Y.encodeStateAsUpdate(doc);
    await mode.select({ type: "snapshot", id: "saved" });
    await mode.select({ type: "current" });
    expect(editor.prosemirrorState.doc.textContent).toBe("Captured");
    mode.close();
    expect(editor.isEditable).toBe(true);
    expect(ySyncPluginKey.getState(editor.prosemirrorState)?.type).toBe(
      fragment,
    );
    // Headless editors do not run the plugin view that hydrates the restored binding.
    expect(Y.encodeStateAsUpdate(doc)).toEqual(remoteContent);
  } finally {
    mode.dispose();
    editor._tiptapEditor.destroy();
    doc.destroy();
  }
});

it("accepts a non-default schema in the public view and extension factory", () => {
  const schema = BlockNoteSchema.create();
  const paragraphOnly = BlockNoteSchema.create({
    blockSpecs: { paragraph: schema.blockSpecs.paragraph },
  });
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment("doc");
  const Versions = createVersioningExtension(
    (
      editor: BlockNoteEditor<
        typeof paragraphOnly.blockSchema,
        typeof paragraphOnly.inlineContentSchema,
        typeof paragraphOnly.styleSchema
      >,
    ) => ({
      adapter: createYjsVersionView(editor, fragment),
      storage: {
        async list() {
          return { ok: true, value: [] };
        },
        async getContent() {
          return { ok: true, value: Y.encodeStateAsUpdate(doc) };
        },
      },
    }),
  );
  const editor = BlockNoteEditor.create(
    withCollaboration({
      schema: paragraphOnly,
      extensions: [Versions()],
      collaboration: { fragment, user: { name: "Test", color: "red" } },
    }),
  );
  try {
    editor.prosemirrorView.updateState(
      editor.prosemirrorState.reconfigure({
        plugins: editor._tiptapEditor.extensionManager.plugins,
      }),
    );
    const mode = editor.getExtension(Versions)!;
    mode.open();
    expect(mode.store.state.mode).toBe("versions");
    mode.close();
  } finally {
    editor._tiptapEditor.destroy();
    doc.destroy();
  }
});
