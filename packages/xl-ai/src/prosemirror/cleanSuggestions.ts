import { BlockNoteEditor } from "@blocknote/core";
import { applySuggestions } from "@handlewithcare/prosemirror-suggest-changes";
import { Transaction } from "prosemirror-state";

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

  const applySuggestionsStepCount = applySuggestionsTr.steps.length;

  const invertMap = applySuggestionsTr.mapping.invert();
  return {
    /**
     * Return a transaction that has all the suggestions applied,
     *
     * you can add new operations to this PR and later rebase those on the original document with `rebaseTr`
     */
    cleanTr: applySuggestionsTr,

    /**
     * Invert map created by applying the suggestions.
     * You can use this to map positions on the "clean" document to positions on the original document
     */
    invertMap,

    mapsAfterClean: () => {
      const maps = applySuggestionsTr.mapping.maps.slice(
        applySuggestionsStepCount
      );
      if (maps.length === 0) {
        throw new Error("No maps after applying suggestions");
      }
      return maps;
    },

    /**
     * Return a new transaction based on the editor state with all the steps you made to cleanTr.
     * These steps are rebased on the original document.
     */
    rebaseTr: () => {
      const steps = applySuggestionsTr.steps.slice(applySuggestionsStepCount);
      if (steps.length === 0) {
        throw new Error("No steps to apply");
      }
      let tr = editor.prosemirrorState.tr;
      for (const step of steps) {
        const mappedStep = step.map(invertMap);
        if (!mappedStep) {
          throw new Error("Step is not mapped");
        }
        tr = tr.step(mappedStep);
      }
      return tr;
    },
  };
}
