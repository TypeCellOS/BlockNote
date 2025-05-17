import { BlockNoteEditor } from "@blocknote/core";
import { applySuggestions } from "@blocknote/prosemirror-suggest-changes";
import { Transaction } from "prosemirror-state";
import { Transform } from "prosemirror-transform";

// Helper function to get the transaction that removes all suggestions from the editor.
//
// (rebaseTool is usually used with a transaction that removes all suggestions from the editor)
export function getApplySuggestionsTr(editor: BlockNoteEditor<any, any, any>) {
  let applySuggestionsTr: Transaction;
  applySuggestions(editor.prosemirrorState, (tr) => {
    applySuggestionsTr = tr;
  });

  // @ts-ignore
  if (!applySuggestionsTr) {
    throw new Error("applySuggestionsTr is not set");
  }

  return applySuggestionsTr;
}

/**
 * A helper function to enable rebasing prosemirror operations.
 *
 * The idea is as follows:
 * - There's an update U we want to apply to the editor state E
 * - However, the update U cannot be applied directly to E. For example, because E contains suggestions, or other
 *    formatting incompatible with U
 * - We can however apply U to a "clean" document E', the projection (one that has no suggestions or other formatting)
 * - We can then use the inverse mapping of E' to E to get U' (the rebased update) which can be applied to E
 *
 * This function takes a `projectionTr`, which is the transaction that turns E into E'
 * It returns a helper object that can be used to rebase operations done to E' onto E
 */
export function rebaseTool(
  editor: BlockNoteEditor<any, any, any>,
  projectionTr: Transaction,
) {
  const invertMap = projectionTr.mapping.invert();
  return {
    doc: projectionTr.doc,

    /**
     * Return a new transform that has the projection applied.
     * You can add new operations to this transform and later rebase those on the original document with `rebaseTr`
     */
    tr: () => {
      return new Transform(projectionTr.doc);
    },

    /**
     * Invert map created by the projection.
     * You can use this to map positions on the "clean" document (the projection) to positions on the original document
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

export type RebaseTool = ReturnType<typeof rebaseTool>;
