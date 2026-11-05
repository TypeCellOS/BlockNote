import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { blockToText } from "../blocks/text.js";
import type { LensBlock } from "../blocks/types.js";
import { markdownFormat } from "../formats/markdown.js";
import { plainTextFormat } from "../formats/plainText.js";
import type { TextFormat } from "../formats/types.js";
import { projectDocument } from "./projectDocument.js";
import { columnSchema } from "../testUtil/fixtures.js";

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
      // Markdown does not show an image without a URL.
      { id: "no-url", type: "image" },
      {
        id: "code",
        type: "codeBlock",
        content: "const a = 1;\n\nconst b = 2;",
      },
    ],
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
      ["nested", "paragraph"],
      // Markdown shows an empty paragraph as a <br> line.
      ["empty", "paragraph"],
      ["code", "codeBlock"],
    ]);
  });

  it("finds blocks that the format does not show", () => {
    const projection = projectDocument(editor, markdownFormat, editor.document);
    expect([...projection.invisibleIds]).toEqual(["no-url"]);
  });

  it("finds blocks that the format shows as more than one block", () => {
    // In plain text, the blank line in the code block makes two paragraphs.
    const projection = projectDocument(
      editor,
      plainTextFormat,
      editor.document,
    );
    expect([...projection.multiParts.keys()]).toEqual(["code"]);
    expect(
      projection.view.filter((viewBlock) => viewBlock.sourceId === "code"),
    ).toHaveLength(2);
  });

  it("makes the round trip only for the blocks that the view does not show as they are (a guard of the speed)", () => {
    // The IDs of the blocks of each call of `serialize` (a separator has no ID).
    const calls: string[][] = [];
    const spy: TextFormat = {
      serialize: (blockEditor, blocks) => {
        calls.push(blocks.map((block) => block.id).filter((id) => id !== ""));
        return markdownFormat.serialize(blockEditor, blocks);
      },
      parse: (blockEditor, text) => markdownFormat.parse(blockEditor, text),
    };
    projectDocument(editor, spy, editor.document);
    // The view, then the round trip of the empty paragraph and the image
    // (markdown does not show an image without a URL). The view shows the
    // other blocks as they are.
    expect(calls).toEqual([
      ["heading", "bullet", "empty", "no-url", "code"],
      ["empty", "no-url"],
    ]);
  });

  it("gives a block of the round trip the neighbors that it has in the text", () => {
    // In the text, a blank line comes after the first paragraph. Thus, plain
    // text removes the white space at its end, and the view does not show
    // it as it is. Its round trip needs a separator after it: else, its
    // part keeps the white space, and does not link to the view block.
    const columns = BlockNoteEditor.create({
      schema: columnSchema,
      initialContent: [
        {
          type: "columnList",
          children: [
            {
              type: "column",
              children: [{ id: "a", type: "paragraph", content: "A\n  " }],
            },
            {
              type: "column",
              children: [{ id: "b", type: "paragraph", content: "B" }],
            },
          ],
        },
      ],
    });
    const projection = projectDocument(
      columns,
      plainTextFormat,
      columns.document as LensBlock[],
    );
    expect(
      projection.view.map((viewBlock) => [
        viewBlock.sourceId,
        blockToText(viewBlock.block),
      ]),
    ).toEqual([
      ["a", "A"],
      ["b", "B"],
    ]);
  });
});
