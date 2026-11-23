import { configureYProsemirror, ySyncPluginKey } from "@y/prosemirror";
import * as Y from "@y/y";
import { expect } from "vite-plus/test";
import { withCollaboration } from "./index.js";
import { blocksToYType } from "../utils.js";
import { YCursorExtension } from "./YCursorPlugin.js";
import type { VersioningController } from "../../extensions/Versioning/Versioning.js";
import { YVersioningExtension } from "../versioning/yhub.js";
import type { VersionStorage } from "../../extensions/Versioning/types.js";
import { YSyncExtension } from "./YSync.js";

it.for(
  [undefined, false].flatMap((showCurrentVersion) =>
    [false, true].map((withSuggestions) => ({
      showCurrentVersion,
      withSuggestions,
    })),
  ),
)(
  "isolates previews and restores the live binding, Current capture=$showCurrentVersion, suggestions=$withSuggestions",
  async (
    { showCurrentVersion, withSuggestions },
    { setupEditor, onTestFinished },
  ) => {
    const doc = new Y.Doc();
    onTestFinished(() => doc.destroy());
    const suggestionDoc = new Y.Doc({ isSuggestionDoc: true });
    onTestFinished(() => suggestionDoc.destroy());
    const renderer = withSuggestions
      ? Y.createDiffRenderer(doc, suggestionDoc)
      : undefined;
    onTestFinished(() => renderer?.destroy());
    const fragment = doc.get("doc");
    let saved: Uint8Array = new Uint8Array();
    const storage: VersionStorage<Uint8Array, Y.ContentMap> = {
      showCurrentVersion,
      list: async () => ({
        ok: true,
        value: { snapshots: [{ id: "saved", createdAt: 1 }] },
      }),
      getContent: async () => ({ ok: true, value: saved }),
    };
    const { editor } = await setupEditor(
      withCollaboration({
        extensions: [
          YVersioningExtension({
            storage,
          }),
        ],
        collaboration: {
          fragment,
          user: { name: "Test", color: "red" },
          ...(withSuggestions ? { suggestionDoc, renderer } : {}),
        },
      }),
    );
    editor.replaceBlocks(editor.document, [
      { type: "paragraph", content: "Captured" },
    ]);
    blocksToYType(editor, editor.document, fragment);
    saved = Y.encodeStateAsUpdateV2(doc);
    editor.registerExtension({
      key: "headlessYSyncState",
      prosemirrorPlugins:
        editor.getExtension(YSyncExtension)!.prosemirrorPlugins,
    });
    editor.exec(configureYProsemirror({ ytype: fragment }));
    const liveBinding = ySyncPluginKey.getState(editor.prosemirrorState)!;
    const cursor = editor.getExtension(YCursorExtension);
    const mode = editor.getExtension<VersioningController>("versioning")!;
    try {
      mode.open();
      expect(editor.isEditable).toBe(false);
      expect(await mode.list()).toEqual({ status: "done" });
      expect(mode.store.state).toMatchObject({
        displayed:
          showCurrentVersion === false
            ? { type: "snapshot", id: "saved" }
            : { type: "current" },
      });
      expect(mode.canCreate).toBe(false);
      expect(mode.canRestore).toBe(false);
      expect(mode.canRemove).toBe(false);
      expect(mode.canRename).toBe(false);
      expect(editor.getExtension(YCursorExtension)).toBeUndefined();
      if (showCurrentVersion === false) {
        expect(
          ySyncPluginKey.getState(editor.prosemirrorState)?.ytype,
        ).not.toBeNull();
      } else {
        expect(
          ySyncPluginKey.getState(editor.prosemirrorState)?.ytype,
        ).toBeNull();
      }
      const { editor: latest } = await setupEditor();
      latest.replaceBlocks(latest.document, [
        { type: "paragraph", content: "Remote latest" },
      ]);
      blocksToYType(latest, latest.document, fragment);
      const remoteContent = Y.encodeStateAsUpdateV2(doc);
      expect(editor.document[0].content).toEqual([
        { type: "text", text: "Captured", styles: {} },
      ]);
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
      expect(editor.document[0].content).toEqual([
        { type: "text", text: "Captured", styles: {} },
      ]);
      mode.close();
      expect(editor.isEditable).toBe(true);
      expect(editor.getExtension(YCursorExtension)).toBe(cursor);
      expect(ySyncPluginKey.getState(editor.prosemirrorState)?.ytype).toBe(
        fragment,
      );
      expect(
        ySyncPluginKey.getState(editor.prosemirrorState)?.customCompare,
      ).toBe(liveBinding.customCompare);
      expect(ySyncPluginKey.getState(editor.prosemirrorState)?.renderer).toBe(
        liveBinding.renderer,
      );
      // Headless editors do not run the plugin view that hydrates the restored binding.
      expect(Y.encodeStateAsUpdateV2(doc)).toEqual(remoteContent);
    } finally {
      mode.dispose();
    }
  },
);
