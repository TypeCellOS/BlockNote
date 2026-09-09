import { describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../BlockNoteEditor.js";

/**
 * @vitest-environment jsdom
 */

function createEditorWithLink() {
  const editor = BlockNoteEditor.create();
  editor.mount(document.createElement("div"));
  editor.replaceBlocks(editor.document, [
    {
      id: "block",
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://google.com",
          content: [{ type: "text", text: "Google", styles: {} }],
        },
      ],
    },
  ]);
  return editor;
}

function linkContent(editor: BlockNoteEditor<any, any, any>) {
  const block = editor.getBlock("block")!;
  return (block.content as any[]).map((inline) => ({
    type: inline.type,
    href: inline.href,
    text: inline.type === "link" ? inline.content[0].text : inline.text,
  }));
}

describe("StyleManager link editing at boundaries", () => {
  it("edits the link when the caret is at its end", () => {
    const editor = createEditorWithLink();
    editor.setTextCursorPosition("block", "end");

    editor.editLink("https://google.com", "Google Search");

    expect(linkContent(editor)).toEqual([
      { type: "link", href: "https://google.com", text: "Google Search" },
    ]);
  });

  it("deletes the link when the caret is at its end", () => {
    const editor = createEditorWithLink();
    editor.setTextCursorPosition("block", "end");

    editor.deleteLink();

    expect(linkContent(editor)).toEqual([
      { type: "text", href: undefined, text: "Google" },
    ]);
  });

  it("edits the link when the caret is at its start", () => {
    const editor = createEditorWithLink();
    editor.setTextCursorPosition("block", "start");

    editor.editLink("https://google.com", "Google Search");

    expect(linkContent(editor)).toEqual([
      { type: "link", href: "https://google.com", text: "Google Search" },
    ]);
  });

  it("does not throw for a position at the very end of the document", () => {
    const editor = createEditorWithLink();
    const end = editor.prosemirrorState.doc.content.size;

    expect(() =>
      editor.editLink("https://github.com", "GitHub", end),
    ).not.toThrow();
    expect(() => editor.deleteLink(end)).not.toThrow();
  });
});
