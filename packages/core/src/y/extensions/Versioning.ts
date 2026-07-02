import {
  configureYProsemirror,
  deltaAttributionToFormat,
  pauseSync,
  nodeToDelta,
  deltaToPSteps,
} from "@y/prosemirror";
import * as d from "lib0/delta";
import * as Y from "@y/y";

import { Transaction } from "prosemirror-state";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { PreviewController } from "../../extensions/Versioning/index.js";
import { findTypeInOtherYdoc } from "../utils.js";
import { mapAttributionToMark } from "./YSync.js";
import { blockMatchNodes } from "./blockMatchNodes.js";

/**
 * Empties the document before a {@link configureYProsemirror} refill so
 * ProseMirror rebuilds every node view instead of reusing a stale-positioned one
 * (BlockNote node views resolve their block eagerly via `getPos()` and throw on
 * a moved node). Sync is paused first so the clear never reaches the Y.Doc.
 *
 * TODO: remove once `configureYProsemirror` applies a minimal diff.
 */
function clearDocumentForConfigure(editor: BlockNoteEditor<any, any, any>) {
  // Pause sync (ytype -> null) so the deletion below stays local.
  editor.exec(pauseSync);
  editor.removeBlocks(editor.document);
}

function getProseMirrorTrFromYFragment({
  tr,
  fragment,
  attributionManager,
}: {
  tr: Transaction;
  fragment: Y.Type;
  attributionManager?: Y.AbstractAttributionManager;
}): Transaction {
  const ycontent = deltaAttributionToFormat(
    fragment.toDeltaDeep(attributionManager || Y.noAttributionsManager),
    mapAttributionToMark,
  );
  // @todo it is preferred to apply the minimal diff - at least for debugging purposes. the
  // document replacal is more reliable though

  const pcontent = nodeToDelta(tr.doc, undefined, true);
  const diff = d.diff(pcontent.done(), ycontent.done(), {
    compare: blockMatchNodes,
  });
  return deltaToPSteps(tr, diff, undefined, undefined);
}

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
  preview: PreviewController<Uint8Array, Y.ContentMap>;
  getCurrentState: () => Y.Type;
  getCurrentContent: () => Uint8Array;
} {
  return {
    getCurrentState: () => fragment,
    // Serialise the live document as a V2 update — the same format that
    // `getContent` returns (via `convertUpdateFormatV1ToV2`) and that
    // `enterPreview` consumes (`applyUpdateV2`). Used to render a read-only
    // diff of the live document against a snapshot.
    getCurrentContent: () => Y.encodeStateAsUpdateV2(fragment.doc!),
    preview: {
      enterPreview: (
        snapshotContent: Uint8Array,
        compareToContent?: Uint8Array,
        attributions?: Y.ContentMap,
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
        // Empty the document before reconfiguring so ProseMirror rebuilds node
        // views from scratch instead of reusing stale-positioned ones. See
        // clearDocumentForConfigure.
        clearDocumentForConfigure(editor);

        editor.exec((state, dispatch) => {
          const tr = getProseMirrorTrFromYFragment({
            tr: state.tr,
            fragment: findTypeInOtherYdoc(fragment, doc),
            // Pass the optional content map as `attrs` so the diff attribution
            // manager knows who/when authored each change. Without it, the AM
            // only produces "what changed" (empty userIds, null timestamps) and
            // downstream mark tooltips show "unknown / unknown time".
            attributionManager: prevSnapshot
              ? Y.createAttributionManagerFromDiff(
                  prevSnapshot.fragment.doc!,
                  doc,
                  attributions ? { attrs: attributions } : undefined,
                )
              : undefined,
          });
          if (dispatch) {
            dispatch(tr);
          }
          return true;
        });
      },
      exitPreview: () => {
        // Empty the document before reconfiguring so ProseMirror rebuilds node
        // views from scratch instead of reusing stale-positioned ones. See
        // clearDocumentForConfigure.
        clearDocumentForConfigure(editor);
        editor.exec(configureYProsemirror({ ytype: fragment }));
      },
      applyRestore: (_snapshotContent: Uint8Array) => {
        // For Yjs-backed versioning, restoration happens on the server (e.g.
        // YHub's `/rollback` endpoint) which publishes a reverting update to
        // the document's room. That update propagates back to this client over
        // the live sync connection and updates `fragment` automatically, so
        // there is nothing to apply locally — we only need to leave preview
        // mode. `exitPreview` is already called by the base extension before
        // this runs, so this is a no-op.
        //
        // Note: this assumes `endpoints.restore` performs the server-side
        // restore. The default in-memory adapter has no server, which is why
        // this is specific to the Yjs collaboration setup.
      },
    },
  };
}
