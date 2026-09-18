import * as Y from "yjs";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { PreviewController } from "../../extensions/Versioning/index.js";
import type { CollaborationOptions } from "./index.js";
import { ForkYDocExtension } from "./ForkYDoc.js";

/**
 * Creates a Yjs v13 adapter that provides the {@link PreviewController}
 * and `getCurrentDocument` callback required by the base
 * {@link VersioningExtension}.
 *
 * Delegates to the {@link ForkYDocExtension} for entering/exiting preview:
 * - **enterPreview**: calls `fork({ initialUpdate: snapshotContent })` to
 *   switch the editor to a temporary doc built from the snapshot.
 * - **exitPreview**: calls `merge({ keepChanges: false })` to discard the
 *   preview and restore the live document.
 * - Restore is unavailable: merging older CRDT state cannot undo live edits.
 */
export function createYjsVersioningAdapter(
  /** The BlockNote editor instance (must have ForkYDocExtension). */
  editor: BlockNoteEditor<any, any, any>,
  /** The full collaboration options (used for `fragment` access). */
  options: CollaborationOptions,
): {
  preview: PreviewController<Uint8Array>;
  getCurrentDocument: () => Y.XmlFragment;
  serializeCurrentContent: () => Uint8Array;
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
    getCurrentDocument() {
      return fragment;
    },
    // V1 encoding, like every other update the v13 stack handles: the fork
    // extension applies this with `Y.applyUpdate`, and a V2 payload fails to
    // decode as soon as the document has any content.
    serializeCurrentContent() {
      return Y.encodeStateAsUpdate(fragment.doc!);
    },
    preview: {
      // Yjs v13 can only fork the document to a single snapshot; it has no way
      // to diff two versions, so comparison is unsupported.
      supportsComparison: false,
      // No applyRestore: merging an older CRDT state cannot undo live edits.
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
    },
  };
}
