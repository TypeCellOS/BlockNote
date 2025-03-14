import { BlockNoteEditor } from "@blocknote/core";
import { Transaction } from "prosemirror-state";
import { Mapping, ReplaceStep, Step } from "prosemirror-transform";

/**
 * Takes an array of ReplaceSteps and applies them as a human-like agent.
 * Every step is split into 3 phases:
 * - select the text to be replaced (1 transaction per ReplaceStep)
 * - replace the text with the first character of the replacement (if any) (1 transaction per ReplaceStep)
 * - insert the replacement character by character (strlen-1 transactions per ReplaceStep)
 *
 * All these phases are dispatched to the `dispatch` function as separate transactions.
 */
export async function applyStepsAsAgent(
  editor: BlockNoteEditor,
  steps: Step[],
  dispatch: (
    tr: Transaction,
    type: "select" | "replace" | "insert"
  ) => Promise<void>
) {
  // Create a mapping to track position changes across all steps
  const stepMapping = new Mapping();

  for (const step of steps) {
    if (!(step instanceof ReplaceStep)) {
      throw new Error("Step is not a ReplaceStep");
    }

    if (step.slice.openStart > 0 || step.slice.openEnd > 0) {
      throw new Error("Slice has openStart or openEnd > 0");
    }

    // Map the step positions through all previous mappings
    const mappedFrom = stepMapping.map(step.from);
    const mappedTo = stepMapping.map(step.to);

    // 1. Select text to be removed/replaced
    const selectTr = editor.prosemirrorState.tr.setMeta("aiAgent", {
      selection: {
        anchor: mappedFrom,
        head: mappedTo,
      },
    });
    await dispatch(selectTr, "select");

    const replacement =
      step.slice.size === 0 ? step.slice.content : step.slice.content.cut(0, 1);

    let replaceEnd = mappedTo;

    // TODO: option to replace instead of deletion / insertion
    const replaceTr = editor.prosemirrorState.tr
      .addMark(mappedFrom, replaceEnd, editor.pmSchema.mark("deletion", {}))
      .insert(replaceEnd, replacement)
      .addMark(
        replaceEnd,
        replaceEnd + replacement.size,
        editor.pmSchema.mark("insertion", {})
      )
      .setMeta("aiAgent", {
        selection: {
          anchor: replaceEnd + 1,
          head: replaceEnd + 1,
        },
      });

    await dispatch(replaceTr, "replace");

    stepMapping.appendMapping(replaceTr.mapping);
    replaceEnd = replaceTr.mapping.map(replaceEnd);

    // 3. Insert remaining characters one by one
    for (let i = 1; i < step.slice.size; i++) {
      const replacement = step.slice.content.cut(i, i + 1);
      const insertTr = editor.prosemirrorState.tr
        .insert(replaceEnd, replacement)
        .addMark(
          replaceEnd,
          replaceEnd + replacement.size,
          editor.pmSchema.mark("insertion", {})
        )
        .setMeta("aiAgent", {
          selection: {
            anchor: replaceEnd + 1,
            head: replaceEnd + 1,
          },
        });

      await dispatch(insertTr, "insert");
      stepMapping.appendMapping(insertTr.mapping);
      replaceEnd = insertTr.mapping.map(replaceEnd);
    }
  }
}
