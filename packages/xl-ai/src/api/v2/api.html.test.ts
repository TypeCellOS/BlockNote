import type { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import {
  getDocumentText,
  htmlFormat,
  updateDocumentFromText,
} from "./index.js";
import {
  addComment,
  commentedText,
  createCommentEditor,
} from "./testUtil/comments.js";
import { createEditor, replaceOnce } from "./testUtil/fixtures.js";

function write(
  editor: BlockNoteEditor<any, any, any>,
  edit: (html: string) => string,
) {
  const text = edit(getDocumentText(editor, htmlFormat));
  return updateDocumentFromText(editor, { format: htmlFormat, text });
}

describe("HTML", () => {
  it("changes a prop that HTML shows", () => {
    const editor = createEditor([
      {
        id: "p",
        type: "paragraph",
        props: { textColor: "red" },
        content: "Hello",
      },
    ]);
    write(editor, (html) =>
      replaceOnce(html, 'data-text-color="red"', 'data-text-color="blue"'),
    );

    expect(editor.getBlock("p")?.props).toMatchObject({ textColor: "blue" });
  });

  it("changes a style that HTML shows, and keeps the other text", () => {
    const editor = createEditor([
      { id: "p", type: "paragraph", content: "Hello world" },
    ]);
    write(editor, (html) => replaceOnce(html, "world", "<u>world</u>"));

    expect(editor.getBlock("p")?.content).toEqual([
      { type: "text", text: "Hello ", styles: {} },
      { type: "text", text: "world", styles: { underline: true } },
    ]);
  });

  it("keeps the ID and the comments of a changed paragraph", () => {
    const editor = createCommentEditor([
      { id: "p", type: "paragraph", content: "Hello world" },
    ]);
    const comment = addComment(editor, "Hello");

    write(editor, (html) =>
      replaceOnce(html, "Hello world", "Hello brave world"),
    );

    expect(editor.getBlock("p")?.content).toEqual([
      { type: "text", text: "Hello brave world", styles: {} },
    ]);
    expect(commentedText(editor.prosemirrorState.doc, comment)).toBe("Hello");
  });

  it("keeps a toggle and its child when the text of the toggle changes", () => {
    const editor = createEditor([
      {
        id: "toggle",
        type: "toggleListItem",
        content: "Toggle",
        children: [{ id: "child", type: "paragraph", content: "Child" }],
      },
    ]);
    write(editor, (html) => replaceOnce(html, ">Toggle<", ">Toggle, edited<"));

    const toggle = editor.getBlock("toggle");
    expect(toggle?.type).toBe("toggleListItem");
    expect(toggle?.children.map((child) => child.id)).toEqual(["child"]);
  });
});
