import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  PartialBlock,
  StyleSchema,
} from "@blocknote/core";
import { Node, Slice } from "@tiptap/pm/model";
import { Selection } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";
import * as pmView from "@tiptap/pm/view";

// Helper function to get the position of a text node with given text content.
// By default, returns the position just before the node, but can be just after
// instead if `after` is set to true.
export const getPosOfTextNode = (
  doc: Node,
  textContent: string,
  after = false,
) => {
  let ret: number | undefined = undefined;

  doc.descendants((node, pos) => {
    if (node.isText && node.textContent === textContent) {
      ret = pos + (after ? node.nodeSize : 0);
      return false;
    }

    return ret === undefined;
  });

  if (ret === undefined) {
    throw new Error(`Text node with content "${textContent}" not found.`);
  }

  return ret;
};

// Helper function to get the position of a table cell node with given text
// content. Returns the position just before the node.
export const getPosOfTableCellNode = (doc: Node, textContent: string) => {
  let ret: number | undefined = undefined;

  doc.descendants((node, pos) => {
    if (node.type.name === "tableCell" && node.textContent === textContent) {
      ret = pos;
      return false;
    }

    return ret === undefined;
  });

  if (ret === undefined) {
    throw new Error(`Table cell node with content "${textContent}" not found.`);
  }

  return ret;
};

export const setupClipboardTest = <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  document: PartialBlock<B, I, S>[],
  getSelection: (pmDoc: Node) => Selection,
) => {
  if (!editor.prosemirrorView) {
    throw new Error("Editor view not initialized.");
  }

  (window as any).__TEST_OPTIONS.mockID = 0;

  editor.replaceBlocks(editor.document, document);

  editor.transact((tr) => tr.setSelection(getSelection(tr.doc)));
};

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
  event: ClipboardEvent,
) {
  const slice = (pmView as any).__parseFromClipboard(
    view,
    text,
    html,
    preferPlain,
    view.state.selection.$from,
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
