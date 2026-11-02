import { BlockNoteEditor } from "@blocknote/core";
import { CommentsExtension, type ThreadStore } from "@blocknote/core/comments";
import { describe, expect, it } from "vite-plus/test";

import {
  getDocumentText,
  markdownFormat,
  updateDocumentFromText,
} from "./api.js";
import { isTableContent } from "./blocks/types.js";
import {
  createEditor,
  documentShape,
  replaceOnce,
} from "./testUtil/fixtures.js";

function write(
  editor: BlockNoteEditor<any, any, any>,
  edit: (markdown: string) => string,
) {
  const text = edit(getDocumentText(editor, markdownFormat));
  return updateDocumentFromText(editor, { format: markdownFormat, text });
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

    expect(editor.getBlock("underlined")?.content).toEqual([
      {
        type: "text",
        text: `Underlined words here.${sentences}`,
        styles: { underline: true },
      },
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

    // In the markdown, "Paragraph nested in a bullet" comes after the
    // outdented bullet. Thus, it cannot stay nested in "Parent bullet".
    expect(documentShape(editor.document).slice(0, 6)).toEqual([
      "colored",
      "heading",
      "bullet",
      "child-bullet",
      "child-paragraph",
      "numbered",
    ]);
  });
  it("keeps a comment on text that the edit does not touch", () => {
    const threadStore = {
      subscribe: () => () => {},
      getThreads: () => new Map(),
    } as unknown as ThreadStore;
    const editor = BlockNoteEditor.create({
      initialContent: [{ id: "p", type: "paragraph", content: "Hello world" }],
      trailingBlock: false,
      extensions: [
        CommentsExtension({ threadStore, resolveUsers: async () => [] }),
      ],
    });
    const comment = editor.pmSchema.marks.comment.create({
      threadId: "thread-1",
      orphan: false,
    });
    // "Hello" is at the positions 3 to 8.
    editor.transact((tr) => tr.addMark(3, 8, comment));

    write(editor, (md) => replaceOnce(md, "Hello world", "Hello brave world"));

    let commented = "";
    editor.prosemirrorState.doc.descendants((node) => {
      if (node.isText && comment.isInSet(node.marks)) {
        commented += node.text;
      }
    });
    expect(commented).toBe("Hello");
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
});
