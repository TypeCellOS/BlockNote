import {
  BlockNoteEditor,
  BlockNoteSchema,
  createBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { blockToText } from "../util/blocks/text.js";
import type { LensBlock } from "../model.js";
import { htmlFormat } from "../formats/html.js";
import { markdownFormat } from "../formats/markdown.js";
import { plainTextFormat } from "../formats/plainText.js";
import type { TextFormat } from "../formats/types.js";
import { projectDocument, roundTripIsolated } from "./projectDocument.js";
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
    const projection = projectDocument(
      editor,
      markdownFormat,
      editor.document,
      markdownFormat.serialize(editor, editor.document),
    );
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
    const projection = projectDocument(
      editor,
      markdownFormat,
      editor.document,
      markdownFormat.serialize(editor, editor.document),
    );
    expect([...projection.invisibleIds]).toEqual(["no-url"]);
  });

  it("shows a code block with a blank line as one paragraph, in plain text", () => {
    // A blank line would start a new paragraph. Thus, plain text shows it as
    // one newline.
    const projection = projectDocument(
      editor,
      plainTextFormat,
      editor.document,
      plainTextFormat.serialize(editor, editor.document),
    );
    const code = projection.view.filter(
      (viewBlock) => viewBlock.sourceId === "code",
    );
    expect(code.map(({ block }) => blockToText(block))).toEqual([
      "const a = 1;\nconst b = 2;",
    ]);
  });

  it("throws for a block type whose export reads back as more than one block", () => {
    const twoParagraphs = createBlockSpec(
      { type: "twoParagraphs" as const, propSchema: {}, content: "none" },
      {
        render: () => ({ dom: document.createElement("div") }),
        toExternalHTML: () => {
          const dom = document.createElement("div");
          dom.innerHTML = "<p>One</p><p>Two</p>";
          return { dom };
        },
      },
    )();
    const custom = BlockNoteEditor.create({
      schema: BlockNoteSchema.create().extend({
        blockSpecs: { ...defaultBlockSpecs, twoParagraphs },
      }),
      initialContent: [{ type: "twoParagraphs" }],
    });
    expect(() =>
      projectDocument(
        custom,
        markdownFormat,
        custom.document as unknown as LensBlock[],
        markdownFormat.serialize(
          custom,
          custom.document as unknown as LensBlock[],
        ),
      ),
    ).toThrow(
      'The format shows a block of type "twoParagraphs" as more than one block',
    );
  });

  it.each([
    ["markdown", markdownFormat],
    ["HTML", htmlFormat],
  ])(
    "gives no view block for a document that the format shows as no block, in %s",
    (_, format) => {
      // The text has no blocks. Its parse gives one empty paragraph (the fill
      // of the schema), which no block of the document gives.
      const imageOnly = BlockNoteEditor.create({
        initialContent: [{ id: "img", type: "image" }],
      });
      const projection = projectDocument(
        imageOnly,
        format,
        imageOnly.document as LensBlock[],
        format.serialize(imageOnly, imageOnly.document as LensBlock[]),
      );
      expect(projection.view).toEqual([]);
      expect([...projection.invisibleIds]).toEqual(["img"]);
    },
  );

  it("does not link a paragraph to a hidden table with the same text, in plain text", () => {
    // Plain text does not show a table. The paragraph has the text of the
    // cells of the table, but its view block links to the paragraph.
    const tableAndParagraph = BlockNoteEditor.create({
      initialContent: [
        {
          id: "table",
          type: "table",
          content: {
            type: "tableContent",
            rows: [{ cells: ["Total", "sales"] }],
          },
        },
        { id: "p", type: "paragraph", content: "Total sales" },
      ],
    });
    const projection = projectDocument(
      tableAndParagraph,
      plainTextFormat,
      tableAndParagraph.document as LensBlock[],
      plainTextFormat.serialize(
        tableAndParagraph,
        tableAndParagraph.document as LensBlock[],
      ),
    );
    expect(
      projection.view.map((viewBlock) => [
        viewBlock.sourceId,
        blockToText(viewBlock.block),
      ]),
    ).toEqual([["p", "Total sales"]]);
    expect([...projection.invisibleIds]).toEqual(["table"]);
  });

  it("throws for a view block that no block of the document gives", () => {
    // A format with a bug: its parse adds an image without a URL.
    const broken: TextFormat = {
      serialize: (serializeEditor, blocks) =>
        markdownFormat.serialize(serializeEditor, blocks),
      parse: (parseEditor, text) => [
        ...markdownFormat.parse(parseEditor, text),
        { id: "", type: "image", props: {}, content: undefined, children: [] },
      ],
    };
    expect(() =>
      projectDocument(
        editor,
        broken,
        editor.document as LensBlock[],
        broken.serialize(editor, editor.document as LensBlock[]),
      ),
    ).toThrow(
      "The format shows 6 blocks, but the blocks of the document give 5",
    );
  });

  it("throws for a format that does not show the blocks in document order", () => {
    // A broken format: its serialize writes the top-level blocks in reverse
    // order. Each block gives one view block, thus the count is correct. No
    // block of the four is at its place. Without the check, view block
    // "Delta" would link to block a, and a change of "Alpha" in the text
    // would change block d.
    const reversing: TextFormat = {
      serialize: (serializeEditor, blocks) =>
        markdownFormat.serialize(serializeEditor, [...blocks].reverse()),
      parse: (parseEditor, text) => markdownFormat.parse(parseEditor, text),
    };
    const fourBlocks = BlockNoteEditor.create({
      initialContent: [
        { id: "a", type: "paragraph", content: "Alpha" },
        { id: "b", type: "paragraph", content: "Beta" },
        { id: "c", type: "paragraph", content: "Gamma" },
        { id: "d", type: "paragraph", content: "Delta" },
      ],
    });
    expect(() =>
      projectDocument(
        fourBlocks,
        reversing,
        fourBlocks.document as LensBlock[],
        reversing.serialize(fourBlocks, fourBlocks.document as LensBlock[]),
      ),
    ).toThrow("The format does not show the blocks in document order");
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
    projectDocument(
      editor,
      spy,
      editor.document,
      spy.serialize(editor, editor.document),
    );
    // The view, then the round trip of the image (markdown does not show an
    // image without a URL). The view shows the other blocks as they are,
    // also the empty paragraph (markdown shows it as a <br> line).
    expect(calls).toEqual([
      ["heading", "bullet", "empty", "no-url", "code"],
      ["no-url"],
    ]);
  });

  it("links a block whose white space the view does not show, in a column", () => {
    // In the text, a blank line comes after the first paragraph. Thus, plain
    // text removes the white space at its end, and the view does not show
    // the block as it is. The block gets the isolated round trip, and it
    // links to its view block by its place in the document order.
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
      plainTextFormat.serialize(columns, columns.document as LensBlock[]),
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

describe("roundTripIsolated", () => {
  it("keeps a block apart whose text is the separator character, if the text contains that character", () => {
    // The separator is a paragraph with the shortest run of one private use
    // character that the text does not contain (see `unusedMarker`). This
    // text contains the character, thus the separator has two of them, and
    // the block "\uE000" is not a separator.
    const text = "Alpha \uE000";
    const editor = BlockNoteEditor.create({
      initialContent: [
        { id: "marker", type: "paragraph", content: "\uE000" },
        { id: "beta", type: "paragraph", content: "Beta" },
      ],
    });
    const results = roundTripIsolated(
      editor,
      plainTextFormat,
      editor.document as LensBlock[],
      text,
    );
    expect(results.map((flat) => flat && blockToText(flat.block))).toEqual([
      "\uE000",
      "Beta",
    ]);
  });
});
