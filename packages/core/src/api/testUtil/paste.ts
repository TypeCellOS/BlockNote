import { Slice } from "@tiptap/pm/model";
import { EditorView } from "@tiptap/pm/view";
import * as pmView from "@tiptap/pm/view";

function sliceSingleNode(slice: Slice) {
  return slice.openStart === 0 &&
    slice.openEnd === 0 &&
    slice.content.childCount === 1
    ? slice.content.firstChild
    : null;
}

// This function is a copy of the `doPaste` function from `@tiptap/pm/view`,
// but made to work in a JSDOM environment. To do this, the `tr.scrollIntoView`
// call has been removed.
// https://github.com/ProseMirror/prosemirror-view/blob/17b508f618c944c54776f8ddac45edcb49970796/src/input.ts#L624
export function doPaste(
  view: EditorView,
  text: string,
  html: string | null,
  preferPlain: boolean,
  event: ClipboardEvent
) {
  const slice = (pmView as any).__parseFromClipboard(
    view,
    text,
    html,
    preferPlain,
    view.state.selection.$from
  );
  if (
    view.someProp("handlePaste", (f) => f(view, event, slice || Slice.empty))
  ) {
    return true;
  }
  if (!slice) {
    return false;
  }

  const singleNode = sliceSingleNode(slice);
  const tr = singleNode
    ? view.state.tr.replaceSelectionWith(singleNode, preferPlain)
    : view.state.tr.replaceSelection(slice);
  view.dispatch(tr.setMeta("paste", true).setMeta("uiEvent", "paste"));
  return true;
}
