import type * as Y from "yjs";

/** The names of the marks of `AIExtension` that show a suggestion. */
export const SUGGESTION_MARK_NAMES = [
  "insertion",
  "deletion",
  "modification",
] as const;

/**
 * Returns true if a text of the Yjs document has a suggestion mark.
 *
 * The suggestions of a proposal are only in a local fork of an editor. A
 * shared Y.Doc with suggestion marks is a bug: a client wrote the text of
 * a proposal into the main document. A host examines this before it reads
 * the main document for a run (see {@link assertNoYjsSuggestions}).
 *
 * The check finds the marks on text. A Y.Doc does not keep the marks on
 * nodes (y-prosemirror 13), thus an inserted block without text is not
 * found.
 */
export function yFragmentHasSuggestions(
  fragment: Y.XmlFragment | Y.XmlElement,
): boolean {
  for (const child of fragment.toArray()) {
    if ("toDelta" in child) {
      const delta = child.toDelta() as { attributes?: object }[];
      if (
        delta.some(({ attributes }) =>
          SUGGESTION_MARK_NAMES.some(
            (name) => attributes !== undefined && name in attributes,
          ),
        )
      ) {
        return true;
      }
    } else if ("toArray" in child && yFragmentHasSuggestions(child)) {
      return true;
    }
  }
  return false;
}

/** Throws if the Yjs document has suggestion marks (see {@link yFragmentHasSuggestions}). */
export function assertNoYjsSuggestions(
  fragment: Y.XmlFragment,
  documentId: string,
): void {
  if (yFragmentHasSuggestions(fragment)) {
    throw new Error(
      `The shared document ${documentId} has suggestion marks: it has the text of a proposal that no user accepted`,
    );
  }
}
