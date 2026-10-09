import { configureYProsemirror } from "@y/prosemirror";
import * as Y from "@y/y";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  decodeFragmentUpdate,
  destroyDecodedFragment,
} from "./snapshotCodec.js";

/**
 * Decode a snapshot, diff it against a baseline if given, and render it.
 *
 * Snapshots are decoded into throwaway documents, so pointing the binding at
 * one is already an isolated state: the live fragment stops receiving view
 * updates, and nothing typed into the preview reaches the live document.
 * {@link configureYProsemirror} rebuilds the binding against the decoded
 * fragment through the same `customCompare`/attribution pipeline the live
 * binding uses; passing the `renderer` keeps the attribution tooltips
 * ("who/when") working.
 */
export function showSnapshotPreview(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
  snapshotContent: Uint8Array,
  compareToContent?: Uint8Array,
  attributions?: Y.ContentMap,
): void {
  const baseline = compareToContent
    ? decodeFragmentUpdate(fragment, compareToContent, {
        suggestionDoc: true,
      })
    : undefined;
  try {
    const snapshot = decodeFragmentUpdate(fragment, snapshotContent);
    try {
      editor.exec(
        configureYProsemirror({
          ytype: snapshot.fragment,
          renderer: baseline
            ? Y.createDiffRenderer(
                baseline.doc,
                snapshot.doc,
                attributions ? { attributions } : undefined,
              )
            : undefined,
        }),
      );
    } finally {
      destroyDecodedFragment(snapshot);
    }
  } finally {
    destroyDecodedFragment(baseline);
  }
}
