import {
  BlockNoteEditor,
  BlockNoteSchema,
  defaultBlockSpecs,
} from "@blocknote/core";
import { withMultiColumn } from "@blocknote/xl-multi-column";
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

  it.each([
    [
      "a row span beyond the table",
      'rowspan="1"><p>c</p>',
      'rowspan="3"><p>c</p>',
    ],
    [
      "a row span that covers a cell",
      'rowspan="1"><p>A</p>',
      'rowspan="2"><p>A</p>',
    ],
    [
      "a column span of 0",
      'colspan="1" rowspan="1"><p>c</p>',
      'colspan="0" rowspan="1"><p>c</p>',
    ],
  ])(
    "gives an error for a table with %s, and does not change the document",
    (_, from, to) => {
      const editor = createEditor([
        {
          id: "t",
          type: "table",
          content: {
            type: "tableContent",
            rows: [{ cells: ["A", "B"] }, { cells: ["c", "d"] }],
          },
        },
      ]);
      const html = getDocumentText(editor, htmlFormat);
      expect(html).toContain(from);
      const before = editor.document;

      expect(
        updateDocumentFromText(editor, {
          format: htmlFormat,
          text: html.replace(from, to),
        }),
      ).toEqual({ error: "invalid-document" });
      expect(editor.document).toEqual(before);
    },
  );

  it("puts two paragraphs into a new column list, without extra columns", () => {
    const editor = BlockNoteEditor.create({
      schema: withMultiColumn(
        BlockNoteSchema.create({ blockSpecs: defaultBlockSpecs }),
      ),
      initialContent: [
        { id: "a", type: "paragraph", content: "Alpha" },
        { id: "b", type: "paragraph", content: "Beta" },
      ],
    });

    updateDocumentFromText(editor, {
      format: htmlFormat,
      text: '<div class="bn-block-column-list"><div class="bn-block-column"><p>Alpha</p></div><div class="bn-block-column"><p>Beta</p></div></div>',
    });

    expect(editor.document).toHaveLength(1);
    expect(
      editor.document[0].children.map((column) =>
        column.children.map((block) => block.id),
      ),
    ).toEqual([["a"], ["b"]]);
  });
});
