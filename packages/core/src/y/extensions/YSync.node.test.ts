// @vitest-environment node
import { pauseSync, ySyncPluginKey } from "@y/prosemirror";
import * as Y from "@y/y";
import { afterEach, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { withCollaboration } from "./index.js";
import { YSyncExtension } from "./YSync.js";

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    cleanup();
  }
});

it.each([false, true])(
  "ignores sync callbacks after unmount (off supported: %s)",
  (removableSyncListener) => {
    const doc = new Y.Doc();
    const fragment = doc.get("doc");
    const listeners = new Set<(synced: boolean) => void>();
    const provider = {
      awareness: undefined,
      synced: false,
      on(_event: string, callback: (synced: boolean) => void) {
        listeners.add(callback);
      },
      ...(removableSyncListener
        ? {
            off(_event: string, callback: (synced: boolean) => void) {
              listeners.delete(callback);
            },
          }
        : {}),
    };
    const editor = BlockNoteEditor.create(
      withCollaboration({
        collaboration: {
          fragment,
          provider,
          user: { name: "Test", color: "red" },
        },
      }),
    );
    cleanups.push(() => doc.destroy());
    cleanups.push(() => editor._tiptapEditor.destroy());
    const sync = editor.getExtension(YSyncExtension)!;
    for (const plugin of sync.prosemirrorPlugins) {
      editor._tiptapEditor.registerPlugin(plugin);
    }
    // The mount hook only needs an AbortSignal. Test its real callback and
    // cleanup without constructing a DOM or a ProseMirror plugin view.
    const controller = new AbortController();
    const cleanup = sync.mount({ signal: controller.signal });
    cleanups.push(() => {
      controller.abort();
      cleanup?.();
    });
    expect(listeners.size).toBe(1);
    const callback = [...listeners][0];
    callback(true);
    expect(ySyncPluginKey.getState(editor.prosemirrorState)?.ytype).toBe(
      fragment,
    );
    editor.exec((state, dispatch) => pauseSync(state, dispatch ?? null));
    controller.abort();
    cleanup?.();
    if (removableSyncListener) {
      expect(listeners.size).toBe(0);
    }
    callback(true);
    expect(ySyncPluginKey.getState(editor.prosemirrorState)?.ytype).toBeNull();
  },
);
