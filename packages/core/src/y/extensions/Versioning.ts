import { pauseSync, ySyncPluginKey } from "@y/prosemirror";
import * as Y from "@y/y";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { VersionViewAdapter } from "../../extensions/Versioning/types.js";
import { ForkYDocExtension } from "./ForkYDoc.js";
import { serializeFragment } from "./snapshotCodec.js";
import { showSnapshotPreview } from "./snapshotPreview.js";

/** Uses the existing fork primitive, but exposes only an owned view. */
export function createYVersionView(
  editor: BlockNoteEditor,
  fragment: Y.Node,
): VersionViewAdapter<Uint8Array, Y.ContentMap> {
  return {
    supportsComparison: true,
    open() {
      const fork = editor.getExtension(ForkYDocExtension);
      const binding = ySyncPluginKey.getState(editor.prosemirrorState);
      if (
        !fork ||
        fork.store.state.isForked ||
        binding?.renderer ||
        binding?.ytype !== fragment
      ) {
        throw new Error(
          "Versioning requires an active plain live binding and an available fork",
        );
      }
      const current = {
        content: serializeFragment(fragment),
        capturedAt: Date.now(),
      };
      try {
        fork.fork();
        editor.exec((state, dispatch) => pauseSync(state, dispatch ?? null));
      } catch (error) {
        fork.merge({ keepChanges: false });
        throw error;
      }
      let closed = false;
      return {
        current,
        show({ content, comparison }) {
          if (closed) {
            throw new Error("Version view is closed");
          }
          showSnapshotPreview(
            editor,
            fragment,
            content,
            comparison?.content,
            comparison?.attributions,
          );
        },
        close() {
          if (closed) {
            return;
          }
          fork.merge({ keepChanges: false });
          closed = true;
        },
      };
    },
  };
}
