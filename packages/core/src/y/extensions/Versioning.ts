import { configureYProsemirror } from "@y/prosemirror";
import * as Y from "@y/y";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { PreviewController } from "../../extensions/Versioning/index.js";
import { serializeFragment } from "./snapshotCodec.js";
import { showSnapshotPreview } from "./snapshotPreview.js";

/**
 * No-op: the server applies the restore and publishes a reverting update that
 * propagates over live sync; exitPreview already ran before this.
 */
export function applyServerSideRestore(_snapshotContent: Uint8Array): void {}

/** Wire a Yjs fragment into the versioning adapter's preview/serialize hooks. */
export function createYjsVersioningAdapter(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
): {
  preview: PreviewController<Uint8Array, Y.ContentMap>;
  getCurrentDocument: () => Y.Node;
  serializeCurrentContent: () => Uint8Array;
} {
  return {
    getCurrentDocument() {
      return fragment;
    },
    serializeCurrentContent() {
      return serializeFragment(fragment);
    },
    preview: {
      enterPreview(
        snapshotContent: Uint8Array,
        compareToContent?: Uint8Array,
        attributions?: Y.ContentMap,
      ) {
        showSnapshotPreview(
          editor,
          fragment,
          snapshotContent,
          compareToContent,
          attributions,
        );
      },
      exitPreview() {
        editor.exec(configureYProsemirror({ ytype: fragment }));
      },
      applyRestore: applyServerSideRestore,
    },
  };
}
