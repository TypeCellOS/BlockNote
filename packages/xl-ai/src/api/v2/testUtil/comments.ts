import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import {
  CommentsExtension,
  DefaultThreadStoreAuth,
} from "@blocknote/core/comments";
import { YjsThreadStore } from "@blocknote/core/yjs";
import type { Mark, Node } from "prosemirror-model";
import * as Y from "yjs";

/** Editor options with the comments extension, so that the schema has the comment mark. */
export function commentEditorOptions() {
  const threadStore = new YjsThreadStore(
    "lens",
    new Y.Doc().getMap("threads"),
    new DefaultThreadStoreAuth("lens", "editor"),
  );
  return {
    trailingBlock: false,
    extensions: [
      CommentsExtension({ threadStore, resolveUsers: async () => [] }),
    ],
  };
}

/** An editor with the comments extension (see {@link commentEditorOptions}). */
export function createCommentEditor(initialContent: PartialBlock[]) {
  return BlockNoteEditor.create({ initialContent, ...commentEditorOptions() });
}

/**
 * Adds a comment mark to the first occurrence of `text`, and returns the mark.
 * The thread ID is the text. Thus, comments on different texts are different
 * marks.
 */
export function addComment(
  editor: BlockNoteEditor<any, any, any>,
  text: string,
): Mark {
  const comment = editor.pmSchema.marks.comment.create({
    threadId: text,
    orphan: false,
  });
  let from: number | undefined;
  editor.prosemirrorState.doc.descendants((node, pos) => {
    const index = node.isText ? (node.text ?? "").indexOf(text) : -1;
    if (from === undefined && index !== -1) {
      from = pos + index;
    }
  });
  if (from === undefined) {
    throw new Error(`Text ${JSON.stringify(text)} not found`);
  }
  const start = from;
  editor.transact((tr) => tr.addMark(start, start + text.length, comment));
  return comment;
}

/**
 * Returns the text that has the comment mark. The mark can come from another
 * editor (another schema): thus, the marks compare by their type name and
 * thread ID.
 */
export function commentedText(doc: Node, comment: Mark): string {
  let result = "";
  doc.descendants((node) => {
    if (
      node.isText &&
      node.marks.some(
        (mark) =>
          mark.type.name === comment.type.name &&
          mark.attrs.threadId === comment.attrs.threadId,
      )
    ) {
      result += node.text;
    }
  });
  return result;
}
