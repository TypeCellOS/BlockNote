import { configureYProsemirror, pauseSync } from "@y/prosemirror";
import * as Y from "@y/y";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { getProseMirrorTrFromYFragment } from "../utils.js";
import {
  decodeFragmentUpdate,
  destroyDecodedFragment,
} from "./snapshotCodec.js";

/**
 * Empty the doc before a {@link configureYProsemirror} refill so ProseMirror
 * rebuilds node views instead of reusing stale-positioned ones.
 * TODO: drop once configureYProsemirror applies a minimal diff.
 */
function clearDocumentForConfigure(editor: BlockNoteEditor<any, any, any>) {
  // Upstream types dispatch as required and nullable; Command makes it optional.
  editor.exec((state, dispatch) => pauseSync(state, dispatch ?? null));
  editor.removeBlocks(editor.document);
}

/** Render an already-decoded snapshot fragment into the editor, optionally diffed. */
export function renderFragmentToEditor(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
  renderer?: Y.AbstractRenderer | null,
) {
  clearDocumentForConfigure(editor);
  editor.exec((state, dispatch) => {
    const tr = getProseMirrorTrFromYFragment({
      tr: state.tr,
      fragment,
      // Pass the attributions so the diff renderer knows who/when authored each
      // change; without them tooltips show "unknown / unknown time".
      renderer,
    });
    if (dispatch) {
      dispatch(tr);
    }
    return true;
  });
}

/** Leave preview mode and rebind live Yjs sync. */
export function rebindLiveFragment(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
) {
  clearDocumentForConfigure(editor);
  editor.exec(configureYProsemirror({ ytype: fragment }));
}

/** Decode a snapshot, diff it against a baseline if given, and render it. */
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
      renderFragmentToEditor(
        editor,
        snapshot.fragment,
        baseline
          ? Y.createDiffRenderer(
              baseline.doc,
              snapshot.doc,
              attributions ? { attributions } : undefined,
            )
          : undefined,
      );
    } finally {
      destroyDecodedFragment(snapshot);
    }
  } finally {
    destroyDecodedFragment(baseline);
  }
}
