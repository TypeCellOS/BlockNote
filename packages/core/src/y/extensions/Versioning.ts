import { pauseSync, ySyncPluginKey } from "@y/prosemirror";
import * as Y from "@y/y";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { VersionViewAdapter } from "../../extensions/Versioning/types.js";
import type {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import { ForkYDocExtension } from "./ForkYDoc.js";
import { CollaborationExtension } from "./index.js";
import { serializeFragment } from "./snapshotCodec.js";
import { showSnapshotPreview } from "./snapshotPreview.js";

/** Uses the existing fork primitive, but exposes only an owned view. */
export function createYVersionView<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, ISchema, SSchema>,
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
            editor.getExtension(CollaborationExtension)?.experimental,
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
