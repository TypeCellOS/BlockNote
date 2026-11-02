import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { CommentsExtension, type ThreadStore } from "@blocknote/core/comments";
import type { Mark, Node } from "prosemirror-model";

/** An editor with the comments extension, so that its schema has the comment mark. */
export function createCommentEditor(initialContent: PartialBlock[]) {
  const threadStore = {
    subscribe: () => () => {},
    getThreads: () => new Map(),
  } as unknown as ThreadStore;
  return BlockNoteEditor.create({
    initialContent,
    trailingBlock: false,
    extensions: [
      CommentsExtension({ threadStore, resolveUsers: async () => [] }),
    ],
  });
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

/** Returns the text that has the comment mark. */
export function commentedText(doc: Node, comment: Mark): string {
  let result = "";
  doc.descendants((node) => {
    if (node.isText && comment.isInSet(node.marks)) {
      result += node.text;
    }
  });
  return result;
}
