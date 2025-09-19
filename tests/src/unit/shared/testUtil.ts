import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  PartialBlock,
  StyleSchema,
} from "@blocknote/core";
import { Node } from "@tiptap/pm/model";
import { Selection } from "@tiptap/pm/state";

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

// Inits the test editor, resetting the mock block ID counter and optionally
// replacing the document as well as setting the selection.
export const initTestEditor = <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  document?: PartialBlock<B, I, S>[],
  getSelection?: (pmDoc: Node) => Selection,
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;

  if (document) {
    editor.replaceBlocks(editor.document, document);
  }

  if (getSelection) {
    editor.transact((tr) => tr.setSelection(getSelection(tr.doc)));
  }
};
