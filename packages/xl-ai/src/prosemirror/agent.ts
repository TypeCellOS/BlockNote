import { BlockNoteEditor } from "@blocknote/core";
import { Fragment, Slice } from "prosemirror-model";
import { AllSelection, TextSelection } from "prosemirror-state";
import { ReplaceStep, Step, Transform } from "prosemirror-transform";

export type AgentStep = {
  prosemirrorSteps: Step[];
  selection:
    | {
        anchor: number;
        head: number;
      }
    | undefined;
  type: "select" | "replace" | "insert";
};

/**
 * Takes an array of ReplaceSteps and applies them as a human-like agent.
 * Every step is split into 3 phases:
 * - select the text to be replaced (1 transaction per ReplaceStep)
 * - replace the text with the first character of the replacement (if any) (1 transaction per ReplaceStep)
 * - insert the replacement character by character (strlen-1 transactions per ReplaceStep)
 *
 * All these phases are dispatched to the `dispatch` function as separate transactions.
 */
export function getStepsAsAgent(editor: BlockNoteEditor, steps: Step[]) {
  // const stepMapping = new Mapping();
  const agentSteps: AgentStep[] = [];

  const tr = new Transform(editor.prosemirrorState.doc);

  for (const step of steps) {
    if (!(step instanceof ReplaceStep)) {
      throw new Error("Step is not a ReplaceStep");
    }

    // Map the step positions through all previous mappings
    // const mappedFrom = stepMapping.map(step.from);
    // const mappedTo = stepMapping.map(step.to);

    if ((step as any).structure) {
      // const tr = editor.prosemirrorState.tr.step(step.map(stepMapping)!);
      // await dispatch(tr, "replace");
      agentSteps.push({
        prosemirrorSteps: [step.map(tr.mapping)!],
        selection: undefined,
        type: "replace",
      });

      tr.step(step.map(tr.mapping)!);
      continue;
    }

    if (step.slice.openStart > 0 || step.slice.openEnd > 0) {
      // throw new Error("Slice has openStart or openEnd > 0");
      // TODO: these are node type changes, now, we're replacing the content at once, but
      // we should split them into multiple replace steps (one for the node type change, and others for content changes)
      // const tr = editor.prosemirrorState.tr.step(step.map(stepMapping)!);
      // await dispatch(tr, "replace");

      agentSteps.push({
        prosemirrorSteps: [step.map(tr.mapping)!],
        selection: undefined,
        type: "replace",
      });
      tr.step(step.map(tr.mapping)!);
      continue;
    }

    // 1. Select text to be removed/replaced
    // const selectTr = editor.prosemirrorState.tr.setMeta("aiAgent", {
    //   selection: {
    //     anchor: mappedFrom,
    //     head: mappedTo,
    //   },
    // });
    // await dispatch(selectTr, "select");
    agentSteps.push({
      prosemirrorSteps: [],
      selection: {
        anchor: tr.mapping.map(step.from),
        head: tr.mapping.map(step.to),
      },
      type: "select",
    });

    // 2. Replace the text with the first character (if any) of the replacement

    const sliceTextContent = step.slice.content.textBetween(0, step.slice.size);

    const alreadyHasSameText =
      sliceTextContent ===
      tr.doc.textBetween(tr.mapping.map(step.from), tr.mapping.map(step.to));

    let sliceTo: number;

    if (alreadyHasSameText) {
      sliceTo = step.slice.content.size; // replace all at once, it's probaly a mark update
    } else if (sliceTextContent.length === 0) {
      sliceTo = step.slice.content.size; // there's no replacement text, so use entire slice as replacement
    } else {
      // replace with the first character (similar to how a user would do it when selecting text and starting to type)
      const firstCharIndex = getFirstChar(step.slice.content);
      if (firstCharIndex === undefined) {
        // should have been caught by previous if statement
        throw new Error("unexpected: no first character found");
      }
      sliceTo = firstCharIndex + 1;
    }

    let replaceEnd = tr.mapping.map(step.to);
    const replaceFrom = tr.mapping.map(step.to);
    let first = true;
    for (let i = sliceTo; i <= step.slice.content.size; i++) {
      const stepIndex = tr.steps.length;
      if (first) {
        tr.addMark(
          tr.mapping.map(step.from),
          replaceEnd,
          editor.pmSchema.mark("deletion", {})
        );
      }

      // note, instead of inserting one charachter at a time at the end (a, b, c)
      // we're replacing the entire part every time (a, ab, abc)
      // would be cleaner to do just insertions, but didn't get this to work with
      // the add operation
      const replacement = Slice.maxOpen(step.slice.content.cut(0, i));
      // console.log("replacement", replaceFrom, replaceEnd, replacement);
      tr.replace(replaceFrom, replaceEnd, replacement).addMark(
        replaceFrom,
        replaceFrom + replacement.content.size,
        editor.pmSchema.mark("insertion", {})
      );

      replaceEnd = tr.mapping.slice(stepIndex).map(replaceEnd);
      const sel = TextSelection.near(
        tr.doc.resolve(replaceFrom + replacement.content.size),
        -1
      );

      agentSteps.push({
        prosemirrorSteps: tr.steps.slice(stepIndex),
        selection: {
          anchor: sel.from,
          head: sel.from,
        },
        type: first ? "replace" : "insert",
      });
      first = false;
    }
  }

  return agentSteps;
}

/**
 * helper method to get the index of the first character of a fragment
 */
function getFirstChar(fragment: Fragment) {
  let index = 0;
  for (const content of fragment.content) {
    if (content.isText) {
      return index;
    }
    const sel = TextSelection.atStart(content);
    if (sel instanceof AllSelection) {
      // no text position found
      index += content.nodeSize;
      continue;
    }
    index += sel.head;
    if (!content.isLeaf) {
      // for regular nodes, add 1 position for the node opening
      // (annoyingly TextSelection.atStart doesn't account for this)
      index += 1;
    }
    return index;
  }
  return undefined;
}
