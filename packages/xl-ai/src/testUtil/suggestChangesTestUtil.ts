import { BlockNoteEditor } from "@blocknote/core";
import { revertSuggestions } from "@blocknote/prosemirror-suggest-changes";
import { Node } from "prosemirror-model";
import { expect } from "vitest";

export function validateRejectingResultsInOriginalDoc(
  editor: BlockNoteEditor<any, any, any>,
  originalDoc: Node,
) {
  revertSuggestions(editor.prosemirrorState, (tr) => {
    expect(tr.doc.toJSON()).toEqual(originalDoc.toJSON());
  });
}
