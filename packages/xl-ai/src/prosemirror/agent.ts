import { BlockNoteEditor, UnreachableCaseError } from "@blocknote/core";
import {
  disableSuggestChanges,
  enableSuggestChanges,
  isSuggestChangesEnabled,
  withSuggestChanges,
} from "@handlewithcare/prosemirror-suggest-changes";
import { Fragment, Slice } from "prosemirror-model";
import { AllSelection, TextSelection, Transaction } from "prosemirror-state";
import { Mapping, ReplaceStep, Step, Transform } from "prosemirror-transform";

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
 */
export function getStepsAsAgent(editor: BlockNoteEditor, steps: Step[]) {
  const agentSteps: AgentStep[] = [];

  const tr = new Transform(editor.prosemirrorState.doc);

  for (const step of steps) {
    if ((step as any).structure) {
      // Note: for structure changes (e.g.: node type changes) we don't trigger any selection
      // or mark any content as deleted / inserted
      // TODO: LET prosemirror-suggest-changes handle this
      // TODO: add test
      agentSteps.push({
        prosemirrorSteps: [step.map(tr.mapping)!],
        selection: undefined,
        type: "replace",
      });

      tr.step(step.map(tr.mapping)!);
      continue;
    }

    if (!(step instanceof ReplaceStep)) {
      throw new Error("Step is not a ReplaceStep");
    }

    if (step.slice.openStart > 0 || step.slice.openEnd > 0) {
      // throw new Error("Slice has openStart or openEnd > 0");
      // TODO: these are node type changes AND content changes in a single step
      // we should split them into multiple replace steps (one for the node type change, and others for content changes)
      // throw new Error("Slice has openStart or openEnd > 0"); // TODO: diagnose + document when this is
      // debugger;
      // TODO: add test

      // For now, we just issue a single replace step
      agentSteps.push({
        prosemirrorSteps: [step.map(tr.mapping)!],
        selection: undefined,
        type: "replace",
      });
      tr.step(step.map(tr.mapping)!);
      continue;
    }

    // 1. Select text to be removed/replaced
    agentSteps.push({
      prosemirrorSteps: [],
      selection: {
        anchor: tr.mapping.map(step.from),
        head: tr.mapping.map(step.to),
      },
      type: "select",
    });

    // Replace the content
    const sliceTextContent = step.slice.content.textBetween(0, step.slice.size);

    const alreadyHasSameText =
      sliceTextContent ===
      tr.doc.textBetween(tr.mapping.map(step.from), tr.mapping.map(step.to));

    let sliceTo: number;

    if (alreadyHasSameText) {
      sliceTo = step.slice.content.size; // replace all at once, it's probably a mark update
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

    // Note that below, we don't actually delete content, but we mark it as deleted
    // with a deletion mark. Similarly, we mark inserted content with an insertion mark.
    // It might be cleaner to;
    // a) make this optional
    // b) actually delete / insert the content and let prosemirror-suggest-changes handle the marks
    for (let i = sliceTo; i <= step.slice.content.size; i++) {
      const stepIndex = tr.steps.length;
      if (first) {
        tr.addMark(
          tr.mapping.map(step.from),
          replaceEnd,
          editor.pmSchema.mark("deletion", {})
        );
        // tr.delete(tr.mapping.map(step.from), replaceEnd);
        // replaceFrom = tr.mapping.map(step.to);
        replaceEnd = tr.mapping.map(step.to);
      }

      // note, instead of inserting one charachter at a time at the end (a, b, c)
      // we're replacing the entire part every time (a, ab, abc)
      // would be cleaner to do just insertions, but didn't get this to work with the add operation
      // (and this kept code relatively simple)
      const replacement = new Slice(step.slice.content.cut(0, i), 0, 0);

      tr.replace(replaceFrom, replaceEnd, replacement).addMark(
        replaceFrom,
        replaceFrom + replacement.content.size,
        editor.pmSchema.mark("insertion", {})
      );
      replaceEnd = tr.mapping.slice(stepIndex).map(replaceEnd);

      // tr.replace(replaceFrom, replaceEnd, replacement);
      // replaceEnd = replaceFrom + replacement.content.size;

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
        type: first
          ? "replace" // 2. Replace the text with the first character (if any) of the replacement
          : "insert", // 3. Insert the replacement character by character
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

export async function agentStepToTr(
  editor: BlockNoteEditor<any, any, any>,
  step: AgentStep,
  options: { withDelays: boolean },
  mapping: Mapping
) {
  if (options.withDelays) {
    if (step.type === "select") {
      await new Promise((resolve) => setTimeout(resolve, 100));
    } else if (step.type === "insert") {
      await new Promise((resolve) => setTimeout(resolve, 10));
    } else if (step.type === "replace") {
      await new Promise((resolve) => setTimeout(resolve, 200));
    } else {
      throw new UnreachableCaseError(step.type);
    }
  }
  let tr = editor.prosemirrorState.tr.setMeta("addToHistory", false);

  if (step.selection) {
    tr.setMeta("aiAgent", {
      selection: {
        anchor: mapping.map(step.selection.anchor),
        head: mapping.map(step.selection.head),
      },
    });
  }
  for (const pmStep of step.prosemirrorSteps) {
    const result = tr.maybeStep(pmStep.map(mapping)!);
    if (result.failed) {
      // this would fail for tables, but has since been fixed using filterTransaction (in AIExtension)
      // we now throw an error here, but maybe safer as warning when shipping (TODO)

      throw new Error("failed to apply step");
      // console.warn("failed to apply step", pmStep);
    }
  }

  function fakeDispatch(suggestTr: Transaction) {
    tr = suggestTr;
  }

  enableSuggestChanges(editor.prosemirrorState, editor.dispatch);
  if (!isSuggestChangesEnabled(editor.prosemirrorState)) {
    throw new Error(
      "suggest changes could not be enabled, is the AI / suggestion plugin enabled?"
    );
  }
  withSuggestChanges(fakeDispatch).bind({
    get state() {
      return editor.prosemirrorState;
    },
  })(tr);
  disableSuggestChanges(editor.prosemirrorState, editor.dispatch);

  // TODO: errors thrown here are not shown in UI / console
  return tr;
}
