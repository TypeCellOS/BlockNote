/**
 * @vitest-environment jsdom
 */
import { TextSelection } from "prosemirror-state";
import { describe, expect, it } from "vite-plus/test";

import { selectedFragmentToHTML } from "../api/clipboard/toClipboard/copyExtension.js";
import { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { CommentsExtension } from "./extension.js";
import type { ThreadStore } from "./threadstore/ThreadStore.js";

// Creates an editor whose first paragraph ("Hello world") has a comment on
// "Hello", and returns the clipboard HTML of copying that comment.
function createEditorWithComment() {
  const threadStore = {
    subscribe: () => () => {},
    getThreads: () => new Map([["thread-1", { id: "thread-1" }]]),
  } as unknown as ThreadStore;
  const editor = BlockNoteEditor.create({
    initialContent: [
      { type: "paragraph", content: "Hello world" },
      { type: "paragraph", content: "target" },
    ],
    trailingBlock: false,
    extensions: [
      CommentsExtension({ threadStore, resolveUsers: async () => [] }),
    ],
  });
  editor.mount(document.createElement("div"));
  editor.transact((tr) =>
    tr.addMark(
      3,
      8,
      editor.pmSchema.marks.comment.create({
        threadId: "thread-1",
        orphan: false,
      }),
    ),
  );
  editor.transact((tr) => tr.setSelection(TextSelection.create(tr.doc, 3, 8)));
  const { clipboardHTML } = selectedFragmentToHTML(
    editor.prosemirrorView!,
    editor,
  );
  return { editor, clipboardHTML };
}

function pasteAtEndOfTarget(editor: BlockNoteEditor, html: string) {
  let end = 0;
  editor.prosemirrorState.doc.descendants((node, pos) => {
    if (node.isText && node.text === "target") {
      end = pos + node.nodeSize;
    }
  });
  editor.transact((tr) => tr.setSelection(TextSelection.create(tr.doc, end)));
  editor.pasteHTML(html, true);
}

function commentedText(editor: BlockNoteEditor) {
  const texts: string[] = [];
  editor.prosemirrorState.doc.descendants((node) => {
    if (node.marks.some((mark) => mark.type.name === "comment")) {
      texts.push(node.text!);
    }
  });
  return texts;
}

describe("CommentsExtension", () => {
  it("doesn't paste the comment of copied text", () => {
    const { editor, clipboardHTML } = createEditorWithComment();

    pasteAtEndOfTarget(editor, clipboardHTML);

    expect(editor.document[1].content).toMatchObject([
      { type: "text", text: "targetHello" },
    ]);
    // The comment stays on the original text only.
    expect(commentedText(editor)).toEqual(["Hello"]);
  });

  it("keeps the comment of text moved by dragging", () => {
    const { editor, clipboardHTML } = createEditorWithComment();
    const view = editor.prosemirrorView!;
    // Mark the paste as the drop of an internal drag-and-drop move.
    (view as any).dragging = {
      slice: view.state.selection.content(),
      move: true,
    };

    pasteAtEndOfTarget(editor, clipboardHTML);

    expect(commentedText(editor)).toEqual(["Hello", "Hello"]);
  });
});
