import {
  BlockNoteEditor,
  BlockNoteSchema,
  defaultBlockSpecs,
  createInlineContentSpec,
  defaultInlineContentSpecs,
  type PartialBlock,
} from "@blocknote/core";
import { withMultiColumn } from "@blocknote/xl-multi-column";
import { describe, expect, it } from "vite-plus/test";

import {
  computeTextUpdate,
  getDocumentText,
  markdownFormat,
  updateDocumentFromText,
} from "./index.js";
import { isTableContent } from "./blocks/types.js";
import {
  addComment,
  commentedText,
  createCommentEditor,
} from "./testUtil/comments.js";
import {
  createEditor,
  documentShape,
  replaceOnce,
} from "./testUtil/fixtures.js";
import { canonicalText } from "./testUtil/canonical.js";
import { valid } from "./testUtil/valid.js";

/** An editor with two columns: "Alpha" in column c1 and "Beta" in column c2. */
function createColumnsEditor() {
  return BlockNoteEditor.create({
    schema: withMultiColumn(
      BlockNoteSchema.create({ blockSpecs: defaultBlockSpecs }),
    ),
    initialContent: [
      {
        id: "list",
        type: "columnList",
        children: [
          {
            id: "c1",
            type: "column",
            children: [{ id: "a", type: "paragraph", content: "Alpha" }],
          },
          {
            id: "c2",
            type: "column",
            children: [{ id: "b", type: "paragraph", content: "Beta" }],
          },
        ],
      },
    ],
  });
}

function write(
  editor: BlockNoteEditor<any, any, any>,
  edit: (markdown: string) => string,
) {
  const text = edit(getDocumentText(editor, markdownFormat));
  return valid(
    updateDocumentFromText(editor, { format: markdownFormat, text }),
  );
}

const originalShape = [
  "colored",
  "heading",
  "bullet",
  ["child-bullet", "child-paragraph"],
  "numbered",
  "checked",
  "toggle",
  ["toggle-child"],
  "quote",
  "code",
  "image",
  "empty-1",
  "empty-2",
  "hard-break",
  "divider",
  "table",
  "underlined",
  "last",
];

describe("markdown", () => {
  it("a changed paragraph keeps its ID, colors and alignment", () => {
    const editor = createEditor();
    const update = write(editor, (md) =>
      replaceOnce(
        md,
        "Colored centered paragraph",
        "Colored paragraph, edited",
      ),
    );

    expect(update.operations).toEqual([
      {
        type: "update",
        id: "colored",
        update: {
          content: [
            { type: "text", text: "Colored paragraph, edited", styles: {} },
          ],
        },
      },
    ]);
    expect(editor.getBlock("colored")?.props).toEqual({
      textColor: "red",
      backgroundColor: "blue",
      textAlignment: "center",
    });
  });

  it("keeps underline on changed text and on new text in it", () => {
    const editor = createEditor();
    write(editor, (md) =>
      replaceOnce(md, "Underlined words here", "Underlined words right here"),
    );

    expect(editor.getBlock("underlined")?.content).toEqual([
      {
        type: "text",
        text: "Underlined words right here",
        styles: { underline: true },
      },
    ]);
  });

  it("adds bold and keeps underline", () => {
    const editor = createEditor();
    write(editor, (md) =>
      replaceOnce(md, "Underlined words here", "Underlined **words** here"),
    );

    expect(editor.getBlock("underlined")?.content).toEqual([
      { type: "text", text: "Underlined ", styles: { underline: true } },
      { type: "text", text: "words", styles: { bold: true, underline: true } },
      { type: "text", text: " here", styles: { underline: true } },
    ]);
  });

  it("changes the level of a heading and keeps its text color and underline", () => {
    const editor = createEditor();
    const content = editor.getBlock("heading")?.content;
    write(editor, (md) => replaceOnce(md, "## **Bold**", "### **Bold**"));

    const heading = editor.getBlock("heading");
    expect(heading?.props).toMatchObject({ level: 3 });
    expect(heading?.content).toEqual(content);
  });

  it("changes a heading to a paragraph and keeps its text color and underline", () => {
    const editor = createEditor();
    const content = editor.getBlock("heading")?.content;
    write(editor, (md) => replaceOnce(md, "## **Bold**", "**Bold**"));

    const paragraph = editor.getBlock("heading");
    expect(paragraph?.type).toBe("paragraph");
    expect(paragraph?.content).toEqual(content);
  });

  it("keeps a toggle as a toggle when its text changes (markdown shows it as a bullet)", () => {
    const editor = createEditor();
    write(editor, (md) => replaceOnce(md, "* Toggle\n", "* Toggle, edited\n"));

    const toggle = editor.getBlock("toggle");
    expect(toggle?.type).toBe("toggleListItem");
    expect(toggle?.children.map((child) => child.id)).toEqual(["toggle-child"]);
  });

  it("changes the checked state of a checklist item", () => {
    const editor = createEditor();
    write(editor, (md) => replaceOnce(md, "* [x] Checked", "* [ ] Checked"));

    expect(editor.getBlock("checked")?.props).toMatchObject({ checked: false });
  });

  it("keeps the language of a code block", () => {
    const editor = createEditor();
    write(editor, (md) => replaceOnce(md, "const x = 1;", "const x = 2;"));

    const code = editor.getBlock("code");
    expect(code?.props).toMatchObject({ language: "javascript" });
    expect(code?.content).toEqual([
      { type: "text", text: "const x = 2;", styles: {} },
    ]);
  });

  it("keeps the width and alignment of an image when its caption changes", () => {
    const editor = createEditor();
    write(editor, (md) =>
      replaceOnce(md, "<figcaption>Caption<", "<figcaption>New caption<"),
    );

    expect(editor.getBlock("image")?.props).toMatchObject({
      caption: "New caption",
      previewWidth: 300,
      textAlignment: "right",
    });
  });

  it("keeps the color of a table cell when its text changes", () => {
    const editor = createEditor();
    write(editor, (md) => replaceOnce(md, "| c          |", "| c, edited  |"));

    const table = editor.getBlock("table")?.content;
    if (!isTableContent(table)) {
      throw new Error("Expected table content");
    }
    // Markdown shows the table with an empty header row. The merge does not add it.
    expect(table.rows).toHaveLength(2);
    expect(table.headerRows).toBeUndefined();
    expect(table).toMatchObject({
      rows: [
        { cells: [{ content: [{ text: "A" }] }, { content: [{ text: "B" }] }] },
        {
          cells: [
            {
              props: { backgroundColor: "yellow" },
              content: [{ text: "c, edited" }],
            },
            { content: [{ text: "d" }] },
          ],
        },
      ],
    });
  });

  it("does not change a table with a short row when the text changes another block", () => {
    // A markdown import can give a table with a short row (for example the
    // contributors table of many READMEs).
    const editor = BlockNoteEditor.create({
      initialContent: [
        { id: "p", type: "paragraph", content: "Before" },
        {
          id: "t",
          type: "table",
          content: {
            type: "tableContent",
            rows: [{ cells: ["a", "b"] }, { cells: ["c"] }],
          },
        },
      ],
    });
    const text = getDocumentText(editor, markdownFormat);

    const update = valid(
      computeTextUpdate(editor, {
        format: markdownFormat,
        text: replaceOnce(text, "Before", "Before, edited"),
      }),
    );

    expect(update.operations.map((operation) => operation.type)).toEqual([
      "update",
    ]);
    expect(update.operations[0]).toMatchObject({ id: "p" });
  });

  it("a new paragraph at the top keeps all other blocks", () => {
    const editor = createEditor();
    const update = write(editor, (md) => `New first paragraph\n\n${md}`);

    expect(update.operations.map((operation) => operation.type)).toEqual([
      "insert",
    ]);
    const [inserted, ...rest] = documentShape(editor.document);
    expect(editor.getBlock(inserted as string)?.content).toEqual([
      { type: "text", text: "New first paragraph", styles: {} },
    ]);
    expect(rest).toEqual(originalShape);
  });

  it("a removed paragraph removes only that block", () => {
    const editor = createEditor();
    const update = write(editor, (md) =>
      replaceOnce(md, "\n\nLast paragraph", ""),
    );

    expect(update.operations).toEqual([{ type: "delete", id: "last" }]);
  });

  it("a split paragraph keeps the ID and props on the first part", () => {
    const editor = createEditor();
    write(editor, (md) =>
      replaceOnce(
        md,
        "Colored centered paragraph",
        "Colored centered\n\nparagraph",
      ),
    );

    const [first, second] = editor.document;
    expect(first.id).toBe("colored");
    expect(first.content).toEqual([
      { type: "text", text: "Colored centered", styles: {} },
    ]);
    expect(first.props).toMatchObject({ textColor: "red" });
    expect(second.content).toEqual([
      { type: "text", text: "paragraph", styles: {} },
    ]);
  });

  it("a paragraph with fully new text at the same position keeps its ID", () => {
    const editor = createEditor();
    write(editor, (md) => replaceOnce(md, "Last paragraph", "Something else"));

    expect(editor.getBlock("last")?.content).toEqual([
      { type: "text", text: "Something else", styles: {} },
    ]);
  });

  it("a paragraph with many new sentences keeps its ID and props", () => {
    const editor = createEditor();
    const sentences = Array.from(
      { length: 8 },
      (_, i) => ` This is new sentence number ${i + 1}.`,
    ).join("");
    write(editor, (md) =>
      replaceOnce(
        md,
        "Colored centered paragraph",
        `Colored centered paragraph.${sentences}`,
      ),
    );

    const colored = editor.getBlock("colored");
    expect(colored?.props).toEqual({
      textColor: "red",
      backgroundColor: "blue",
      textAlignment: "center",
    });
    expect(colored?.content).toEqual([
      {
        type: "text",
        text: `Colored centered paragraph.${sentences}`,
        styles: {},
      },
    ]);
  });

  it("a paragraph with many new sentences keeps its ID, also next to a new paragraph", () => {
    const editor = createEditor();
    const sentences = " More text. And more text. And even more text here.";
    write(editor, (md) =>
      replaceOnce(
        md,
        "Underlined words here",
        `A new paragraph\n\nUnderlined words here.${sentences}`,
      ),
    );

    // The new text at the end of the content does not get the hidden
    // underline (see `merge/inline.ts`).
    expect(editor.getBlock("underlined")?.content).toEqual([
      {
        type: "text",
        text: "Underlined words here",
        styles: { underline: true },
      },
      { type: "text", text: `.${sentences}`, styles: {} },
    ]);
  });

  it("two joined paragraphs keep the ID of the first paragraph", () => {
    const editor = createEditor();
    write(editor, (md) =>
      replaceOnce(
        md,
        "Underlined words here\n\nLast paragraph",
        "Underlined words here. Last paragraph",
      ),
    );

    expect(editor.getBlock("last")).toBeUndefined();
    expect(editor.getBlock("underlined")).toBeDefined();
  });

  it("two joined paragraphs keep the ID of the first paragraph, also if the second is larger", () => {
    const editor = createEditor([
      { id: "first", type: "paragraph", content: "First part is here." },
      {
        id: "second",
        type: "paragraph",
        content: "Second part follows with more words than the first.",
      },
    ]);
    write(editor, (md) => md.replace(".\n\nSecond", ". Second"));

    expect(editor.document.map((block) => block.id)).toEqual(["first"]);
  });

  it("keeps nesting and blocks that markdown does not show, when other text changes", () => {
    const editor = createEditor();
    write(editor, (md) =>
      replaceOnce(md, "Last paragraph", "Last paragraph, edited"),
    );

    // The paragraph in the bullet stays nested, although markdown shows it
    // without nesting. The empty paragraphs stay, although markdown does not
    // show them.
    expect(documentShape(editor.document)).toEqual(originalShape);
  });

  it("moves an outdented list item and keeps the block order of the text", () => {
    const editor = createEditor();
    write(editor, (md) =>
      replaceOnce(md, "\n  * Child bullet", "\n* Child bullet"),
    );

    // In the markdown, the indented "Paragraph nested in a bullet" comes
    // after the outdented bullet. Thus, it is now a child of that bullet.
    expect(documentShape(editor.document).slice(0, 5)).toEqual([
      "colored",
      "heading",
      "bullet",
      "child-bullet",
      ["child-paragraph"],
    ]);
  });
  it("a paragraph that the text moves keeps its ID, props and comments", () => {
    const editor = createCommentEditor([
      { id: "a", type: "paragraph", content: "First paragraph" },
      {
        id: "b",
        type: "paragraph",
        props: { textColor: "red" },
        content: "Second paragraph",
      },
      { id: "c", type: "paragraph", content: "Third paragraph" },
    ]);
    const comment = addComment(editor, "Second");

    const update = write(editor, (md) =>
      replaceOnce(
        md,
        "Second paragraph\n\nThird paragraph",
        "Third paragraph\n\nSecond paragraph",
      ),
    );

    expect(update.operations.map((operation) => operation.type)).toEqual([
      "move",
    ]);
    expect(editor.document.map((block) => block.id)).toEqual(["a", "c", "b"]);
    expect(editor.getBlock("b")?.props).toMatchObject({ textColor: "red" });
    expect(commentedText(editor.prosemirrorState.doc, comment)).toBe("Second");
  });

  it("keeps a comment on text that the edit does not touch", () => {
    const editor = createCommentEditor([
      { id: "p", type: "paragraph", content: "Hello world" },
    ]);
    const comment = addComment(editor, "Hello");

    write(editor, (md) => replaceOnce(md, "Hello world", "Hello brave world"));

    expect(commentedText(editor.prosemirrorState.doc, comment)).toBe("Hello");
  });

  it("keeps a comment on a block that the text moves", () => {
    const editor = createCommentEditor([
      {
        id: "fruit",
        type: "bulletListItem",
        content: "Fruit",
        children: [{ id: "pears", type: "bulletListItem", content: "Pears" }],
      },
      { id: "end", type: "paragraph", content: "End" },
    ]);
    const comment = addComment(editor, "Pears");

    const update = write(editor, (md) =>
      replaceOnce(md, "  * Pears", "* Pears"),
    );

    expect(update.operations.map((operation) => operation.type)).toEqual([
      "move",
    ]);
    expect(commentedText(editor.prosemirrorState.doc, comment)).toBe("Pears");
  });

  it("a new block between a paragraph and its nested child goes into the paragraph, thus the child stays nested", () => {
    const editor = createEditor([
      {
        id: "intro",
        type: "paragraph",
        content: "Buy the fresh items first.",
        children: [
          { id: "note", type: "paragraph", content: "A nested note." },
        ],
      },
      { id: "end", type: "paragraph", content: "End" },
    ]);
    write(editor, (md) =>
      replaceOnce(md, "first.\n\nA nested", "first.\n\nNew note.\n\nA nested"),
    );

    const [inserted] = editor.document[0].children;
    expect(editor.getBlock(inserted.id)?.content).toEqual([
      { type: "text", text: "New note.", styles: {} },
    ]);
    expect(documentShape(editor.document)).toEqual([
      "intro",
      [inserted.id, "note"],
      "end",
    ]);
  });

  it("a small change in each of many bullets keeps the ID of each bullet", () => {
    const editor = createEditor(
      Array.from({ length: 300 }, (_, i) => ({
        id: `b${i}`,
        type: "bulletListItem" as const,
        content: `Item ${i} alpha beta gamma delta epsilon`,
      })),
    );
    const update = write(editor, (md) =>
      md.replaceAll("alpha", "omega").replaceAll("beta", "zeta"),
    );

    expect(
      update.operations.filter((operation) => operation.type !== "update"),
    ).toEqual([]);
    expect(editor.document.map((block) => block.id)).toEqual(
      Array.from({ length: 300 }, (_, i) => `b${i}`),
    );
  });

  describe("images keep their hidden props", () => {
    const images = [
      {
        id: "a",
        type: "image" as const,
        props: { url: "https://example.com/a.png", previewWidth: 100 },
      },
      {
        id: "b",
        type: "image" as const,
        props: { url: "https://example.com/b.png", previewWidth: 500 },
      },
      { id: "end", type: "paragraph" as const, content: "End" },
    ];

    it("when the text swaps two images", () => {
      const editor = createEditor(images);
      write(editor, (md) => {
        const [a, b, ...rest] = md.split("\n\n");
        return [b, a, ...rest].join("\n\n");
      });

      expect(editor.getBlock("a")?.props).toMatchObject({
        url: "https://example.com/a.png",
        previewWidth: 100,
      });
      expect(editor.getBlock("b")?.props).toMatchObject({
        url: "https://example.com/b.png",
        previewWidth: 500,
      });
    });

    it("when the text removes the first of two images", () => {
      const editor = createEditor(images);
      write(editor, (md) => md.split("\n\n").slice(1).join("\n\n"));

      expect(editor.getBlock("a")).toBeUndefined();
      expect(editor.getBlock("b")?.props).toMatchObject({
        url: "https://example.com/b.png",
        previewWidth: 500,
      });
    });
  });

  it("keeps a comment in a table cell when the text changes another cell", () => {
    const editor = createCommentEditor([
      {
        id: "table",
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: ["Commented cell", "Other"] }, { cells: ["c", "d"] }],
        },
      },
    ]);
    const comment = addComment(editor, "Commented");

    write(editor, (md) => replaceOnce(md, "Other", "Changed"));

    expect(JSON.stringify(editor.getBlock("table")?.content)).toContain(
      "Changed",
    );
    expect(commentedText(editor.prosemirrorState.doc, comment)).toBe(
      "Commented",
    );
  });

  it("changes a row with a merged cell: the row of the text replaces the row", () => {
    const editor = createEditor([
      {
        id: "table",
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            {
              cells: [
                { type: "tableCell", content: "merged", props: { colspan: 2 } },
                { type: "tableCell", content: "x" },
              ],
            },
            { cells: ["a", "b", "c"] },
          ],
        },
      },
    ]);
    write(editor, (md) => replaceOnce(md, "| x ", "| y "));

    expect(JSON.stringify(editor.getBlock("table")?.content)).toContain(
      '"text":"y"',
    );
  });

  it("moves a heading next to an image after a nested list, and keeps the heading", () => {
    // The markdown parse puts the image after the nested list in a new,
    // empty list item, which has no document block. The heading moves to the
    // position of that list item.
    const editor = createEditor([
      { id: "title", type: "heading", content: "Title" },
      {
        id: "item",
        type: "toggleListItem",
        content: "Item",
        children: [
          { id: "task", type: "checkListItem", content: "Task" },
          {
            id: "image",
            type: "image",
            props: { url: "https://example.com/a.png" },
          },
        ],
      },
      { id: "end", type: "paragraph", content: "End" },
    ]);
    const markdown = getDocumentText(editor, markdownFormat);
    expect(markdown).toContain("# Title\n\n");
    const text = markdown
      .replace("# Title\n\n", "")
      .replace("  ![]", "# Title\n\n  ![]");

    const update = valid(
      updateDocumentFromText(editor, {
        format: markdownFormat,
        text,
      }),
    );

    expect(update.warnings).toEqual([]);
    expect(editor.getBlock("title")?.content).toMatchObject([
      { text: "Title" },
    ]);
    expect(editor.document.map((block) => block.id)).toEqual([
      "item",
      "title",
      "image",
      "end",
    ]);
  });

  it("changes the visible image, not an image that markdown does not show", () => {
    // An image without a URL (before an upload) has no markdown.
    const editor = createEditor([
      { id: "p", type: "paragraph", content: "Images" },
      { id: "empty", type: "image", props: { url: "" } },
      {
        id: "shown",
        type: "image",
        props: { url: "https://example.com/b.png", previewWidth: 300 },
      },
    ]);
    const markdown = getDocumentText(editor, markdownFormat);
    expect(markdown).toContain("b.png");

    valid(
      updateDocumentFromText(editor, {
        format: markdownFormat,
        text: markdown.replace("b.png", "x.png"),
      }),
    );

    expect(editor.getBlock("empty")?.props).toMatchObject({ url: "" });
    expect(editor.getBlock("shown")?.props).toMatchObject({
      url: "https://example.com/x.png",
      previewWidth: 300,
    });
  });

  it("swaps two columns if the text swaps their blocks, without a new column", () => {
    const editor = createColumnsEditor();

    const update = valid(
      updateDocumentFromText(editor, {
        format: markdownFormat,
        text: "Beta\n\nAlpha\n",
      }),
    );

    expect(update.operations).toEqual([
      { type: "move", id: "c1", reference: "c2", placement: "after" },
    ]);
    expect(
      editor.document[0].children.map((column) => [
        column.id,
        column.children.map((block) => block.id),
      ]),
    ).toEqual([
      ["c2", ["b"]],
      ["c1", ["a"]],
    ]);
    expect(getDocumentText(editor, markdownFormat)).toBe("Beta\n\nAlpha\n");
  });

  it("keeps the columns if the text adds a block between the blocks of two columns", () => {
    const editor = createColumnsEditor();
    expect(getDocumentText(editor, markdownFormat)).toBe("Alpha\n\nBeta\n");

    valid(
      updateDocumentFromText(editor, {
        format: markdownFormat,
        text: "Alpha\n\nTop\n\nBeta\n\nEnd\n",
      }),
    );

    const [list, end] = editor.document;
    expect(list.id).toBe("list");
    expect(
      list.children.map((column) => [
        column.id,
        column.children.map((block) => block.content),
      ]),
    ).toEqual([
      ["c1", [[{ type: "text", text: "Alpha", styles: {} }]]],
      [
        "c2",
        [
          [{ type: "text", text: "Top", styles: {} }],
          [{ type: "text", text: "Beta", styles: {} }],
        ],
      ],
    ]);
    expect(end.content).toMatchObject([{ text: "End" }]);
  });

  it("puts a block that the text moves between the blocks of two columns into the next column", () => {
    const editor = createColumnsEditor();
    editor.insertBlocks(
      [{ id: "p", type: "paragraph", content: "P" }],
      "list",
      "after",
    );

    valid(
      updateDocumentFromText(editor, {
        format: markdownFormat,
        text: "Alpha\n\nP\n\nBeta\n",
      }),
    );

    // The column list stays: the text did not change Alpha and Beta.
    expect(editor.document.map((block) => block.id)).toEqual(["list"]);
    expect(
      editor.document[0].children.map((column) => [
        column.id,
        column.children.map((block) => block.id),
      ]),
    ).toEqual([
      ["c1", ["a"]],
      ["c2", ["p", "b"]],
    ]);
    expect(getDocumentText(editor, markdownFormat)).toBe(
      "Alpha\n\nP\n\nBeta\n",
    );
  });

  it("removes the only block of a column, and keeps a column with an empty paragraph", () => {
    const editor = createColumnsEditor();
    editor.insertBlocks(
      [
        {
          id: "c3",
          type: "column",
          children: [{ id: "empty", type: "paragraph" }],
        },
      ],
      "c2",
      "after",
    );
    expect(getDocumentText(editor, markdownFormat)).toBe(
      "Alpha\n\nBeta\n\n<br>\n",
    );

    valid(
      updateDocumentFromText(editor, {
        format: markdownFormat,
        text: "Alpha\n\n<br>\n",
      }),
    );

    expect(
      editor.document[0].children.map((column) => [
        column.id,
        column.children.map((block) => block.id),
      ]),
    ).toEqual([
      ["c1", ["a"]],
      ["c3", ["empty"]],
    ]);
  });

  it("writes to an editor with a block without an ID", () => {
    // In an editor without a view, `removeBlocks` can leave a block without
    // an ID. `editor.document` then shows a new ID on each read.
    const editor = createEditor([{ id: "a", type: "paragraph", content: "A" }]);
    editor.removeBlocks(["a"]);

    valid(
      updateDocumentFromText(editor, {
        format: markdownFormat,
        text: "X\n\nY\n",
      }),
    );

    expect(getDocumentText(editor, markdownFormat)).toBe("X\n\nY\n");
    expect(new Set(editor.document.map((block) => block.id)).size).toBe(2);
  });

  it("keeps the column list if the text swaps a top-level block with the block of a column", () => {
    const editor = createColumnsEditor();
    editor.insertBlocks(
      [{ id: "x", type: "paragraph", content: "Xray" }],
      "list",
      "before",
    );
    expect(getDocumentText(editor, markdownFormat)).toBe(
      "Xray\n\nAlpha\n\nBeta\n",
    );

    updateDocumentFromText(editor, {
      format: markdownFormat,
      text: "Alpha\n\nXray\n\nBeta\n",
    });

    expect(getDocumentText(editor, markdownFormat)).toBe(
      "Alpha\n\nXray\n\nBeta\n",
    );
    const list = editor.getBlock("list");
    expect(list?.children.map((column) => column.id)).toEqual(["c1", "c2"]);
    expect(editor.getBlock("c2")?.children.map((block) => block.id)).toContain(
      "b",
    );
  });

  describe("moves of blocks in columns", () => {
    function createEditorWithTwoBlocksInEachColumn() {
      return BlockNoteEditor.create({
        schema: withMultiColumn(
          BlockNoteSchema.create({ blockSpecs: defaultBlockSpecs }),
        ),
        initialContent: [
          { id: "top", type: "paragraph", content: "Top" },
          {
            id: "list",
            type: "columnList",
            children: [
              {
                id: "cA",
                type: "column",
                children: [
                  { id: "a1", type: "paragraph", content: "Alpha one" },
                  { id: "a2", type: "paragraph", content: "Alpha two" },
                ],
              },
              {
                id: "cB",
                type: "column",
                children: [
                  { id: "b1", type: "paragraph", content: "Bravo one" },
                  { id: "b2", type: "paragraph", content: "Bravo two" },
                ],
              },
            ],
          },
          { id: "end", type: "paragraph", content: "End" },
        ],
      });
    }
    function shape(editor: BlockNoteEditor<any, any, any>): unknown[] {
      function of(blocks: { id: string; children: any[] }[]): unknown[] {
        return blocks.map((block) =>
          block.children.length > 0 ? [block.id, of(block.children)] : block.id,
        );
      }
      return of(editor.document);
    }

    it("moves a block of a column to the start, out of the column list", () => {
      const editor = createEditorWithTwoBlocksInEachColumn();

      updateDocumentFromText(editor, {
        format: markdownFormat,
        text: "Bravo two\n\nTop\n\nAlpha one\n\nAlpha two\n\nBravo one\n\nEnd\n",
      });

      expect(shape(editor)).toEqual([
        "b2",
        "top",
        [
          "list",
          [
            ["cA", ["a1", "a2"]],
            ["cB", ["b1"]],
          ],
        ],
        "end",
      ]);
    });

    it("keeps the other blocks of the columns if the text swaps two blocks of two columns", () => {
      const editor = createEditorWithTwoBlocksInEachColumn();

      updateDocumentFromText(editor, {
        format: markdownFormat,
        text: "Top\n\nAlpha one\n\nBravo one\n\nAlpha two\n\nBravo two\n\nEnd\n",
      });

      expect(getDocumentText(editor, markdownFormat)).toBe(
        "Top\n\nAlpha one\n\nBravo one\n\nAlpha two\n\nBravo two\n\nEnd\n",
      );
      // The blocks that the text did not move stay in their columns.
      expect(editor.getBlock("cA")?.children.map((b) => b.id)).toContain("a1");
      expect(editor.getBlock("cB")?.children.map((b) => b.id)).toContain("b2");
    });
  });
});

/**
 * Markdown does not show some block types: a file block is a paragraph with
 * a link and a paragraph with its caption, and a video is an image. These
 * paragraphs and images link to the block that gives them (see
 * `projectDocument`).
 */
describe("markdown, blocks that markdown shows as other blocks", () => {
  const format = markdownFormat;
  function createMediaEditor() {
    return createEditor([
      { id: "a", type: "paragraph", content: "Alpha" },
      {
        id: "f",
        type: "file",
        props: {
          url: "https://example.com/report.pdf",
          name: "report.pdf",
          caption: "Q3",
        },
      },
      {
        id: "v",
        type: "video",
        props: { url: "https://example.com/clip.mp4", name: "clip.mp4" },
      },
      { id: "z", type: "paragraph", content: "Zulu" },
    ]);
  }
  const fileText = "[report.pdf](https://example.com/report.pdf)\n\nQ3\n\n";
  const videoText = "![clip.mp4](https://example.com/clip.mp4)\n\n";

  it("removes a file block if the text removes its lines", () => {
    const editor = createMediaEditor();
    const text = getDocumentText(editor, format);

    valid(
      updateDocumentFromText(editor, {
        format,
        text: replaceOnce(text, fileText, ""),
      }),
    );

    expect(editor.document.map((block) => block.id)).toEqual(["a", "v", "z"]);
  });

  it("moves a file block with its props if the text moves its lines", () => {
    const editor = createMediaEditor();
    const text = getDocumentText(editor, format);

    const update = valid(
      updateDocumentFromText(editor, {
        format,
        text: `${replaceOnce(text, fileText, "")}\n${fileText}`,
      }),
    );

    expect(update.warnings).toEqual([]);
    expect(editor.document.map((block) => block.id)).toEqual([
      "a",
      "v",
      "z",
      "f",
    ]);
    expect(editor.getBlock("f")?.props).toMatchObject({
      url: "https://example.com/report.pdf",
      caption: "Q3",
    });
  });

  it("removes a video if the text removes its image", () => {
    const editor = createMediaEditor();
    const text = getDocumentText(editor, format);

    valid(
      updateDocumentFromText(editor, {
        format,
        text: replaceOnce(text, videoText, ""),
      }),
    );

    expect(editor.document.map((block) => block.id)).toEqual(["a", "f", "z"]);
  });

  it("replaces a file block with the paragraphs of the text if the text changes its caption, with a warning", () => {
    const editor = createMediaEditor();
    const text = getDocumentText(editor, format);

    const update = valid(
      updateDocumentFromText(editor, {
        format,
        text: replaceOnce(text, "\n\nQ3\n\n", "\n\nQ3, final\n\n"),
      }),
    );

    expect(update.warnings).toEqual([
      { type: "multi-part-block-replaced", id: "f" },
    ]);
    // The paragraph of the largest part keeps the ID, without the data of
    // the file block.
    expect(editor.getBlock("f")?.type).toBe("paragraph");
    expect(getDocumentText(editor, format)).toContain("Q3, final");
  });
});

describe("markdown, a change of the content kind", () => {
  it("keeps the line break of a paragraph that the text changes into a code block", () => {
    const editor = createEditor([
      { id: "p", type: "paragraph", content: "line one\nline two" },
    ]);
    const text = "```\nline one\nline two\n```\n";

    valid(updateDocumentFromText(editor, { format: markdownFormat, text }));

    expect(editor.getBlock("p")).toMatchObject({
      type: "codeBlock",
      content: [{ type: "text", text: "line one\nline two", styles: {} }],
    });
    expect(
      valid(computeTextUpdate(editor, { format: markdownFormat, text }))
        .operations,
    ).toEqual([]);
  });
});

/**
 * Markdown shows a mention (custom inline content) as its text, for example
 * "@Bob". The parse gives back that text, not the mention. The merge finds
 * the mention by that text (see `MergeOptions.shadowOf`).
 */
describe("markdown, custom inline content", () => {
  const format = markdownFormat;
  const mention = createInlineContentSpec(
    { type: "mention", propSchema: { user: { default: "" } }, content: "none" },
    {
      render: (inlineContent) => {
        const dom = document.createElement("span");
        dom.textContent = `@${inlineContent.props.user}`;
        return { dom };
      },
    },
  );
  function createMentionEditor() {
    return BlockNoteEditor.create({
      schema: BlockNoteSchema.create({
        inlineContentSpecs: { ...defaultInlineContentSpecs, mention },
      }),
      initialContent: [
        {
          id: "p",
          type: "paragraph",
          content: [
            { type: "text", text: "Hi ", styles: {} },
            { type: "mention", props: { user: "Bob" } },
            { type: "text", text: " and welcome", styles: {} },
          ],
        },
      ] as PartialBlock<any, any, any>[],
    });
  }

  it.each([
    ["Hi", "Hello"],
    ["and", "or"],
  ])(
    "keeps a mention if the text changes the word %s next to it",
    (word, replacement) => {
      const editor = createMentionEditor();
      const text = getDocumentText(editor, format);

      valid(
        updateDocumentFromText(editor, {
          format,
          text: replaceOnce(text, word, replacement),
        }),
      );

      expect(editor.getBlock("p")?.content).toMatchObject([
        { type: "text", text: `${word === "Hi" ? replacement : "Hi"} ` },
        { type: "mention", props: { user: "Bob" } },
        {
          type: "text",
          text: ` ${word === "and" ? replacement : "and"} welcome`,
        },
      ]);
    },
  );

  it("changes a mention into text if the text changes the text of the mention", () => {
    const editor = createMentionEditor();
    const text = getDocumentText(editor, format);

    valid(
      updateDocumentFromText(editor, {
        format,
        text: replaceOnce(text, "@Bob", "@Alice"),
      }),
    );

    expect(editor.getBlock("p")?.content).toEqual([
      { type: "text", text: "Hi @Alice and welcome", styles: {} },
    ]);
  });
});

describe("a table with merged cells", () => {
  it("applies a change of a row under a cell that spans two rows, without the merged cells, with a warning", () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          id: "t",
          type: "table",
          content: {
            type: "tableContent",
            rows: [
              {
                cells: [
                  { type: "tableCell", props: { rowspan: 2 }, content: "A" },
                  "B",
                ],
              },
              { cells: ["C"] },
            ],
          },
        },
      ] as PartialBlock[],
    });
    const text = getDocumentText(editor, markdownFormat);
    const update = valid(
      updateDocumentFromText(editor, {
        format: markdownFormat,
        text: replaceOnce(text, "| C", "| Changed"),
      }),
    );
    expect(getDocumentText(editor, markdownFormat)).toContain("Changed");
    expect(update.warnings).toEqual([
      { type: "merged-cells-removed", id: "t" },
    ]);
  });
});

describe("a nesting that the format does not show", () => {
  it("does not stay under a parent whose type the text changes", () => {
    // Markdown does not show the child of a paragraph as nested. Under a
    // bullet, it would show it, thus the child becomes the next block.
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          id: "parent",
          type: "paragraph",
          content: "Parent",
          children: [{ id: "child", type: "paragraph", content: "Child" }],
        },
        { id: "end", type: "paragraph", content: "End" },
      ],
    });
    const text = replaceOnce(
      getDocumentText(editor, markdownFormat),
      "Parent",
      "* Parent",
    );
    valid(updateDocumentFromText(editor, { format: markdownFormat, text }));
    expect(getDocumentText(editor, markdownFormat)).toBe(
      canonicalText(editor, markdownFormat, text),
    );
    expect(editor.document.map((block) => block.id)).toEqual([
      "parent",
      "child",
      "end",
    ]);
  });
});
