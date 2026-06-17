import { configureYProsemirror } from "@y/prosemirror";
import * as Y from "@y/y";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { PreviewController } from "../../extensions/Versioning/index.js";
import { findTypeInOtherYdoc } from "../utils.js";

/**
 * Creates a Yjs-specific adapter that provides the {@link PreviewController}
 * and `getCurrentState` callback required by the base
 * {@link VersioningExtension}.
 *
 * This is wired automatically by the {@link CollaborationExtension} when
 * `versioningEndpoints` is provided. You only need to call this directly if
 * you're using the `VersioningExtension` outside of the collaboration wrapper.
 */
export function createYjsVersioningAdapter(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Type,
): {
  preview: PreviewController<Uint8Array>;
  getCurrentState: () => Y.Type;
} {
  return {
    getCurrentState: () => fragment,
    preview: {
      enterPreview: (
        snapshotContent: Uint8Array,
        compareToContent?: Uint8Array,
      ) => {
        let prevSnapshot: { fragment: Y.Type } | undefined;
        if (compareToContent) {
          const compareToDoc = new Y.Doc({ isSuggestionDoc: true });
          Y.applyUpdateV2(compareToDoc, compareToContent);
          prevSnapshot = {
            fragment: findTypeInOtherYdoc(fragment, compareToDoc),
          };
        }

        const doc = new Y.Doc();
        Y.applyUpdateV2(doc, snapshotContent);
        editor.exec(
          configureYProsemirror({
            ytype: findTypeInOtherYdoc(fragment, doc),
            attributionManager: prevSnapshot
              ? Y.createAttributionManagerFromDiff(
                  prevSnapshot.fragment.doc!,
                  doc,
                )
              : undefined,
          }),
        );
      },
      exitPreview: () => {
        editor.exec(configureYProsemirror({ ytype: fragment }));
      },
      applyRestore: (_snapshotContent: Uint8Array) => {
        throw new Error(
          "Restore is not yet implemented for Yjs versioning adapter.",
        );
      },
    },
  };
}
