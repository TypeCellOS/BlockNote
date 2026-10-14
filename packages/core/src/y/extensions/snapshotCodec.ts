import * as Y from "@y/y";

import { findTypeInOtherYdoc } from "../utils.js";

/** Serialize the live fragment as a V2 update. */
export function serializeFragment(fragment: Y.Node): Uint8Array {
  return Y.encodeStateAsUpdateV2(fragment.doc!);
}

export type DecodedFragment = {
  doc: Y.Doc;
  fragment: Y.Node;
};

/** Materialize a stored update into a throwaway doc and resolve `fragment` inside it. */
export function decodeFragmentUpdate(
  fragment: Y.Node,
  content: Uint8Array,
  opts?: { suggestionDoc?: boolean },
): DecodedFragment {
  const doc = new Y.Doc(
    opts?.suggestionDoc ? { isSuggestionDoc: true } : undefined,
  );
  try {
    Y.applyUpdateV2(doc, content);
    return { doc, fragment: findTypeInOtherYdoc(fragment, doc) };
  } catch (error) {
    // A failed decode must not leak the throwaway doc.
    doc.destroy();
    throw error;
  }
}

/** Release a decoded throwaway doc. */
export function destroyDecodedFragment(
  decoded: DecodedFragment | undefined,
): void {
  decoded?.doc.destroy();
}
