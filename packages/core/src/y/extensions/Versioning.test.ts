// @vitest-environment node
import { configureYProsemirror, ySyncPluginKey } from "@y/prosemirror";
import * as Y from "@y/y";
import { expect, it, vi } from "vite-plus/test";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { withCollaboration } from "./index.js";
import { blocksToYType } from "../utils.js";
import { YCursorExtension } from "./YCursorPlugin.js";
import type { VersioningController } from "../../extensions/Versioning/Versioning.js";
import { VersioningExtension } from "../versioning/yhub.js";
import type { YVersionStorageBinding } from "../versioning/yhub.js";
import type { VersionStorage } from "../../extensions/Versioning/types.js";

it.each(["bound", "descriptor"] as const)(
  "resolves the collaboration fragment with %s storage and isolates live changes",
  async (kind) => {
    const doc = new Y.Doc();
    const fragment = doc.get("doc");
    let saved: Uint8Array = new Uint8Array();
    const storage: VersionStorage<Uint8Array, Y.ContentMap> = {
      list: async () => [{ id: "saved", createdAt: 1 }],
      getContent: async () => saved,
    };
    const bind = vi.fn(
      (context: Parameters<YVersionStorageBinding["bind"]>[0]) => {
        expect(context.fragment).toBe(fragment);
        expect(context.editor.getExtension("versioning")).toBeDefined();
        return storage;
      },
    );
    const editor = BlockNoteEditor.create(
      withCollaboration({
        extensions: [
          VersioningExtension({
            storage: kind === "bound" ? storage : { bind },
          }),
        ],
        collaboration: { fragment, user: { name: "Test", color: "red" } },
      }),
    );
    editor.replaceBlocks(editor.document, [
      { type: "paragraph", content: "Captured" },
    ]);
    blocksToYType(editor, editor.document, fragment);
    saved = Y.encodeStateAsUpdateV2(doc);
    editor.prosemirrorView.updateState(
      editor.prosemirrorState.reconfigure({
        plugins: editor._tiptapEditor.extensionManager.plugins,
      }),
    );
    editor.exec(configureYProsemirror({ ytype: fragment }));
    const liveBinding = ySyncPluginKey.getState(editor.prosemirrorState)!;
    const cursor = editor.getExtension(YCursorExtension);
    const mode = editor.getExtension<VersioningController>("versioning")!;
    try {
      expect(bind).not.toHaveBeenCalled();
      mode.open();
      expect(editor.isEditable).toBe(false);
      expect(await mode.list()).toEqual({ status: "done" });
      expect(mode.canCreate).toBe(false);
      expect(mode.canRestore).toBe(false);
      expect(mode.canRemove).toBe(false);
      expect(mode.rename).toBeUndefined();
      expect(editor.getExtension(YCursorExtension)).toBeUndefined();
      expect(
        ySyncPluginKey.getState(editor.prosemirrorState)?.ytype,
      ).toBeNull();
      const latest = BlockNoteEditor.create();
      try {
        latest.replaceBlocks(latest.document, [
          { type: "paragraph", content: "Remote latest" },
        ]);
        blocksToYType(latest, latest.document, fragment);
      } finally {
        latest._tiptapEditor.destroy();
      }
      const remoteContent = Y.encodeStateAsUpdateV2(doc);
      expect(editor.prosemirrorState.doc.textContent).toBe("Captured");
      await mode.select({ type: "snapshot", id: "saved" });
      const previewBinding = ySyncPluginKey.getState(editor.prosemirrorState)!;
      expect(previewBinding.ytype).not.toBeNull();
      expect(previewBinding.ytype).not.toBe(fragment);
      expect(previewBinding.customCompare).toBe(liveBinding.customCompare);
      expect(previewBinding.attributionMapper).toBe(
        liveBinding.attributionMapper,
      );
      expect(previewBinding.attributedNodes).toBe(liveBinding.attributedNodes);
      expect(previewBinding.isInitialContent).toBe(
        liveBinding.isInitialContent,
      );
      await mode.select({ type: "current" });
      expect(editor.prosemirrorState.doc.textContent).toBe("Captured");
      mode.close();
      expect(editor.isEditable).toBe(true);
      expect(editor.getExtension(YCursorExtension)).toBe(cursor);
      expect(ySyncPluginKey.getState(editor.prosemirrorState)?.ytype).toBe(
        fragment,
      );
      expect(
        ySyncPluginKey.getState(editor.prosemirrorState)?.customCompare,
      ).toBe(liveBinding.customCompare);
      // Headless editors do not run the plugin view that hydrates the restored binding.
      expect(Y.encodeStateAsUpdateV2(doc)).toEqual(remoteContent);
      if (kind === "descriptor") {
        expect(bind).toHaveBeenCalledTimes(1);
        expect(bind.mock.calls[0][0].editor).toBe(editor);
      }
    } finally {
      mode.dispose();
      editor._tiptapEditor.destroy();
      doc.destroy();
    }
  },
);
