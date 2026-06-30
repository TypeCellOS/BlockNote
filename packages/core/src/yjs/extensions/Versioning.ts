import * as Y from "yjs";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { PreviewController } from "../../extensions/Versioning/index.js";
import type { CollaborationOptions } from "./index.js";
import { ForkYDocExtension } from "./ForkYDoc.js";

/**
 * Creates a Yjs v13 adapter that provides the {@link PreviewController}
 * and `getCurrentState` callback required by the base
 * {@link VersioningExtension}.
 *
 * Delegates to the {@link ForkYDocExtension} for entering/exiting preview:
 * - **enterPreview**: calls `fork({ initialUpdate: snapshotContent })` to
 *   switch the editor to a temporary doc built from the snapshot.
 * - **exitPreview**: calls `merge({ keepChanges: false })` to discard the
 *   preview and restore the live document.
 * - **applyRestore**: calls `merge({ keepChanges: true })` to apply the
 *   snapshot content back to the live document.
 *
 * @param editor  - The BlockNote editor instance (must have ForkYDocExtension).
 * @param options - The full collaboration options (used for `fragment` access).
 */
export function createYjsVersioningAdapter(
  editor: BlockNoteEditor<any, any, any>,
  options: CollaborationOptions,
): {
  preview: PreviewController<Uint8Array>;
  getCurrentState: () => Y.XmlFragment;
  getCurrentContent: () => Uint8Array;
} {
  const { fragment } = options;

  function getForkYDoc() {
    const ext = editor.getExtension(ForkYDocExtension);
    if (!ext) {
      throw new Error(
        "ForkYDocExtension is required for the Yjs versioning adapter. " +
          "Make sure it is registered before the VersioningExtension.",
      );
    }
    return ext;
  }

  return {
    getCurrentState: () => fragment,
    getCurrentContent: () => Y.encodeStateAsUpdateV2(fragment.doc!),
    preview: {
      enterPreview(
        snapshotContent: Uint8Array,
        _compareToContent?: Uint8Array,
      ) {
        const forkYDoc = getForkYDoc();

        // If already in a preview (forked state), exit first.
        if (forkYDoc.store.state.isForked) {
          forkYDoc.merge({ keepChanges: false });
        }

        forkYDoc.fork({ initialUpdate: snapshotContent });
      },

      exitPreview() {
        const forkYDoc = getForkYDoc();
        if (forkYDoc.store.state.isForked) {
          forkYDoc.merge({ keepChanges: false });
        }
      },

      applyRestore(_snapshotContent: Uint8Array) {
        // Restoring to an older Yjs state cannot be done by merging a fork
        // because the original doc already contains all CRDT state vectors
        // from the snapshot. Restore must be handled at the endpoint/server
        // level (e.g., the server creates a new Y.Doc and syncs it).
        throw new Error(
          "Restore is not yet implemented for Yjs v13 versioning adapter.",
        );
      },
    },
  };
}
