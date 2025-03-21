import { BlockNoteEditor } from "@blocknote/core";
import { applySuggestions } from "@handlewithcare/prosemirror-suggest-changes";
import { Transaction } from "prosemirror-state";
import { Transform } from "prosemirror-transform";

export function getCleanDoc(editor: BlockNoteEditor) {
  // the updateBlocksOperation never contains suggestions and should be applied to a clean document
  // so we need to apply all suggestions in the editor first
  let applySuggestionsTr: Transaction;
  applySuggestions(editor.prosemirrorState, (tr) => {
    applySuggestionsTr = tr;
  });

  // @ts-ignore
  if (!applySuggestionsTr) {
    throw new Error("applySuggestionsTr is not set");
  }

  const invertMap = applySuggestionsTr.mapping.invert();
  return {
    doc: applySuggestionsTr.doc,

    /**
     * Return a new transform that has all the suggestions applied.
     * You can add new operations to this transform and later rebase those on the original document with `rebaseTr`
     */
    tr: () => {
      return new Transform(applySuggestionsTr.doc);
    },

    /**
     * Invert map created by applying the suggestions.
     * You can use this to map positions on the "clean" document to positions on the original document
     */
    invertMap,

    /**
     * Return a new transaction based on the editor state with all the steps you made to `tr`.
     * These steps are rebased on the original document.
     */
    rebaseTr: (tr: Transform) => {
      if (tr.steps.length === 0) {
        throw new Error("No steps to apply");
      }
      let rebasedTr = editor.prosemirrorState.tr;
      for (const step of tr.steps) {
        const mappedStep = step.map(invertMap);
        if (!mappedStep) {
          throw new Error("Step is not mapped");
        }
        rebasedTr = rebasedTr.step(mappedStep);
      }
      return rebasedTr;
    },
  };
}
