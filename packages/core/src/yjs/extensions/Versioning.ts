import * as Y from "yjs";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { PreviewController } from "../../extensions/Versioning/index.js";
import type { CollaborationOptions } from "./index.js";
import { ForkYDocExtension } from "./ForkYDoc.js";
import { findTypeInOtherYdoc } from "../utils.js";

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
 * - **applyRestore**: replaces the live fragment's children with copies from
 *   the snapshot, so newer edits are removed and the live Y.Doc stays connected.
 */
export function createYjsVersioningAdapter(
  /** The BlockNote editor instance (must have ForkYDocExtension). */
  editor: BlockNoteEditor<any, any, any>,
  /** The collaboration document fragment. */
  options: Pick<CollaborationOptions, "fragment">,
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

      applyRestore(snapshotContent: Uint8Array) {
        // Applying an old update to the live doc would merge CRDT histories,
        // leaving newer edits in place. Copy the snapshot's document children
        // instead, and publish their replacement as one live transaction.
        const snapshotDoc = new Y.Doc();
        let children: Array<Y.XmlElement | Y.XmlText>;
        try {
          Y.applyUpdate(snapshotDoc, snapshotContent);
          const snapshotFragment = findTypeInOtherYdoc(fragment, snapshotDoc);
          children = snapshotFragment.slice().map((child) => child.clone());
        } finally {
          snapshotDoc.destroy();
        }

        fragment.doc!.transact(() => {
          fragment.delete(0, fragment.length);
          fragment.insert(0, children);
        });
      },
    },
  };
}
