import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { blockToText } from "../blocks/text.js";
import { htmlFormat } from "../formats/html.js";
import { markdownFormat } from "../formats/markdown.js";
import { projectDocument } from "../projection/projectDocument.js";
import { parseText, withoutByteOrderMark } from "./parseText.js";

describe("parseText", () => {
  const editor = BlockNoteEditor.create({
    initialContent: [{ id: "p", type: "paragraph", content: "Hello" }],
  });
  const { view } = projectDocument(editor, markdownFormat, editor.document);

  it("gives the blocks in the form that the document stores them", () => {
    const result = parseText(editor, markdownFormat, "Hello\n\nWorld", view);

    expect(result.error).toBeUndefined();
    const blocks = result.error === undefined ? result.blocks : [];
    expect(blocks.map(({ block }) => blockToText(block))).toEqual([
      "Hello",
      "World",
    ]);
    // A missing field gets its default value, as in the document.
    expect(blocks[0].block.props).toEqual(editor.document[0].props);
  });

  it("gives an error for blocks that do not fit the schema", () => {
    // A cell that spans more rows than the table has.
    const text = '<table><tr><td rowspan="3">a</td></tr></table>';

    expect(parseText(editor, htmlFormat, text, view)).toEqual({
      error: "invalid-document",
    });
  });

  it("removes a block that the format does not show", () => {
    // Markdown does not show an image without a URL. The parse of an HTML
    // tag in the text can give one.
    const text = "Hello\n\n<img>";
    expect(markdownFormat.parse(editor, text).map(({ type }) => type)).toEqual([
      "paragraph",
      "image",
    ]);

    const result = parseText(editor, markdownFormat, text, view);

    const blocks = result.error === undefined ? result.blocks : [];
    expect(blocks.map(({ block }) => block.type)).toEqual(["paragraph"]);
  });
});

describe("withoutByteOrderMark", () => {
  it("removes a byte order mark at the start of the text", () => {
    expect(withoutByteOrderMark("\uFEFFHello", "Hello")).toBe("Hello");
  });

  it("keeps it if the text of the document starts with it", () => {
    expect(withoutByteOrderMark("\uFEFFHello", "\uFEFFHello")).toBe(
      "\uFEFFHello",
    );
  });
});
