import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { markdownFormat } from "../formats/markdown.js";
import { plainTextFormat } from "../formats/plainText.js";
import { projectDocument } from "./projectDocument.js";

describe("projectDocument", () => {
  const editor = BlockNoteEditor.create({
    initialContent: [
      { id: "heading", type: "heading", content: "Title" },
      {
        id: "bullet",
        type: "bulletListItem",
        content: "Bullet",
        children: [
          { id: "nested", type: "paragraph", content: "Nested paragraph" },
        ],
      },
      { id: "empty", type: "paragraph" },
      {
        id: "code",
        type: "codeBlock",
        content: "const a = 1;\n\nconst b = 2;",
      },
    ],
  });

  it("renders the document as the format does", () => {
    const projection = projectDocument(editor, markdownFormat, editor.document);
    expect(projection.text).toBe(
      markdownFormat.serialize(editor, editor.document),
    );
  });

  it("links each view block to its source block", () => {
    const projection = projectDocument(editor, markdownFormat, editor.document);
    expect(
      projection.view.map((viewBlock) => [
        viewBlock.sourceId,
        viewBlock.block.type,
      ]),
    ).toEqual([
      ["heading", "heading"],
      ["bullet", "bulletListItem"],
      // Markdown shows the nested paragraph without nesting.
      ["nested", "paragraph"],
      ["code", "codeBlock"],
    ]);
  });

  it("finds blocks that the format does not show", () => {
    const projection = projectDocument(editor, markdownFormat, editor.document);
    expect([...projection.invisibleIds]).toEqual(["empty"]);
  });

  it("finds blocks that the format shows as more than one block", () => {
    // In plain text, the blank line in the code block makes two paragraphs.
    const projection = projectDocument(
      editor,
      plainTextFormat,
      editor.document,
    );
    expect([...projection.multiPartIds]).toEqual(["code"]);
    expect(
      projection.view.filter((viewBlock) => viewBlock.sourceId === "code"),
    ).toHaveLength(2);
  });
});
