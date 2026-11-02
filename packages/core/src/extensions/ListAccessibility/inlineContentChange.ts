import {
  AddMarkStep,
  RemoveMarkStep,
  ReplaceStep,
} from "prosemirror-transform";
import type { Transaction } from "prosemirror-state";

/** True when every step edits inline content without changing block structure. */
export function changesOnlyInlineContent(tr: Transaction) {
  return tr.steps.every((step, index) => {
    if (step instanceof AddMarkStep || step instanceof RemoveMarkStep) {
      return true;
    }
    if (
      !(step instanceof ReplaceStep) ||
      step.slice.openStart ||
      step.slice.openEnd
    ) {
      return false;
    }

    const doc = tr.docs[index];
    if (!doc) {
      return false;
    }
    const from = doc.resolve(step.from);
    if (!from.parent.isTextblock || step.to > from.end(from.depth)) {
      return false;
    }

    const inserted = step.slice.content.content;
    for (let index = 0; index < inserted.length; index++) {
      if (!inserted[index].isInline) {
        return false;
      }
    }
    return true;
  });
}
