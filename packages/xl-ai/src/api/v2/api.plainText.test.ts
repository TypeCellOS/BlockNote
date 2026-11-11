// @vitest-environment node
import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import {
  computeOperations,
  getDocumentText,
  plainTextFormat,
  updateDocument,
} from "./index.js";
import {
  createEditor,
  documentShape,
  replaceOnce,
  writeText,
} from "./testUtil/fixtures.js";
import { richSchema } from "./testUtil/richRandom.js";
import { valid } from "./testUtil/valid.js";

describe("plain text", () => {
  it("a heading with changed text stays a heading and keeps its styles", () => {
    const editor = createEditor();
    writeText(editor, plainTextFormat, (text) =>
      replaceOnce(text, "Bold heading with", "Bold heading, edited, with"),
    );

    const heading = editor.getBlock("heading");
    expect(heading?.type).toBe("heading");
    expect(heading?.props).toMatchObject({ level: 2 });
    expect(heading?.content).toEqual([
      { type: "text", text: "Bold", styles: { bold: true } },
      { type: "text", text: " heading, edited, with ", styles: {} },
      {
        type: "text",
        text: "red underlined",
        styles: { textColor: "red", underline: true },
      },
      { type: "text", text: " text", styles: {} },
    ]);
  });

  it("gives new text in styled text the styles that plain text does not show", () => {
    const editor = createEditor();
    writeText(editor, plainTextFormat, (text) =>
      replaceOnce(text, "red underlined", "red and dotted"),
    );

    expect(editor.getBlock("heading")?.content).toEqual([
      { type: "text", text: "Bold", styles: { bold: true } },
      { type: "text", text: " heading with ", styles: {} },
      {
        type: "text",
        text: "red and dotted",
        styles: { textColor: "red", underline: true },
      },
      { type: "text", text: " text", styles: {} },
    ]);
  });

  it("inserts a new paragraph between blocks", () => {
    const editor = createEditor();
    writeText(editor, plainTextFormat, (text) =>
      replaceOnce(text, "A quote\n\n", "A quote\n\nA new paragraph\n\n"),
    );

    const ids = documentShape(editor.document);
    const inserted = editor.getBlock(ids[ids.indexOf("quote") + 1] as string);
    expect(inserted?.type).toBe("paragraph");
    expect(inserted?.content).toEqual([
      { type: "text", text: "A new paragraph", styles: {} },
    ]);
  });

  it("keeps line breaks inside a paragraph", () => {
    const editor = createEditor();
    writeText(editor, plainTextFormat, (text) =>
      replaceOnce(text, "line one\nline two", "line one\nline 2"),
    );

    expect(editor.getBlock("hard-break")?.content).toEqual([
      { type: "text", text: "line one\nline 2", styles: {} },
    ]);
  });

  it("a small change in each of many paragraphs keeps the ID and props of each paragraph", () => {
    const editor = createEditor(
      Array.from({ length: 300 }, (_, i) => ({
        id: `p${i}`,
        type: "paragraph" as const,
        props: { textColor: "red" },
        content: `Paragraph ${i} alpha beta gamma delta epsilon`,
      })),
    );
    const update = writeText(editor, plainTextFormat, (text) =>
      text.replaceAll("alpha", "omega").replaceAll("beta", "zeta"),
    );

    expect(update.operations).toHaveLength(300);
    expect(
      update.operations.every((operation) => operation.type === "update"),
    ).toBe(true);
    expect(editor.document.map((block) => block.id)).toEqual(
      Array.from({ length: 300 }, (_, i) => `p${i}`),
    );
    expect(
      editor.document.every(
        (block) => (block.props as { textColor?: string }).textColor === "red",
      ),
    ).toBe(true);
  });

  it("does not link a paragraph to a hidden table with the same text", () => {
    const editor = createEditor([
      {
        id: "table",
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: ["Total", "sales"] }],
        },
      },
      { id: "p", type: "paragraph", content: "Total sales" },
    ]);
    writeText(editor, plainTextFormat, (text) =>
      replaceOnce(text, "Total sales", "Total sales grew"),
    );

    expect(editor.getBlock("table")?.type).toBe("table");
    expect(editor.getBlock("p")?.content).toMatchObject([
      { text: "Total sales grew" },
    ]);
  });

  describe("a block with a blank line", () => {
    const blocks = [
      {
        id: "code",
        type: "codeBlock" as const,
        content: "first\n\nsecond",
      },
      { id: "end", type: "paragraph" as const, content: "End" },
    ];

    it("shows the blank line as one newline", () => {
      // A blank line would start a new paragraph in the parse.
      expect(getDocumentText(createEditor(blocks), plainTextFormat)).toBe(
        "first\nsecond\n\nEnd",
      );
    });

    it("keeps the blank line and the block if the text changes a line", () => {
      const editor = createEditor(blocks);
      const update = writeText(editor, plainTextFormat, (text) =>
        replaceOnce(text, "second", "second, changed"),
      );

      expect(update.warnings).toEqual([]);
      expect(editor.getBlock("code")).toMatchObject({
        type: "codeBlock",
        content: [{ text: "first\n\nsecond, changed" }],
      });
    });

    it("keeps the blank line if the text appends to the line before it", () => {
      const editor = createEditor(blocks);
      writeText(editor, plainTextFormat, (text) =>
        replaceOnce(text, "first\n", "first!\n"),
      );

      expect(editor.getBlock("code")?.content).toMatchObject([
        { text: "first!\n\nsecond" },
      ]);
    });

    it("KNOWN LIMIT: loses the blank line if the text inserts at the start of the line after it", () => {
      // The insert of the client and the hidden newline are at the same
      // position. In the target stage, an insert of the document at the
      // position of an insert of the text does not stay (a difference of the
      // format, see `MergeOptions`).
      const editor = createEditor(blocks);
      writeText(editor, plainTextFormat, (text) =>
        replaceOnce(text, "\nsecond", "\n!second"),
      );

      expect(editor.getBlock("code")?.content).toMatchObject([
        { text: "first\n!second" },
      ]);
    });
  });

  it("keeps many hidden blocks in a row", () => {
    const editor = createEditor([
      { id: "first", type: "paragraph", content: "First" },
      ...Array.from({ length: 6000 }, (_, i) => ({
        id: `empty${i}`,
        type: "paragraph" as const,
      })),
      { id: "last", type: "paragraph", content: "Last" },
    ]);
    writeText(editor, plainTextFormat, (text) =>
      replaceOnce(text, "Last", "Last, edited"),
    );

    expect(editor.document).toHaveLength(6002);
    expect(editor.getBlock("last")?.content).toMatchObject([
      { text: "Last, edited" },
    ]);
  });
});

describe("plain text, a new editor", () => {
  it("gives only the blocks of the text, without the empty block of the new editor", () => {
    const editor = BlockNoteEditor.create();

    valid(
      updateDocument(editor, {
        base: "current",
        format: plainTextFormat,
        text: "Hello\n\nWorld",
      }),
    );

    expect(editor.document.map((block) => block.content)).toMatchObject([
      [{ text: "Hello" }],
      [{ text: "World" }],
    ]);
  });
});

describe("plain text, a code block with a blank line", () => {
  it("keeps the block, its language and the blank line if the text changes the last line", () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          id: "c",
          type: "codeBlock",
          props: { language: "javascript" },
          content: "if (a) {\n  b();\n\n}",
        },
        { id: "p", type: "paragraph", content: "After" },
      ],
    });
    const text = getDocumentText(editor, plainTextFormat);

    const update = valid(
      updateDocument(editor, {
        base: "current",
        format: plainTextFormat,
        text: text.replace("\n}", "\n} // end"),
      }),
    );

    // Plain text shows the blank line as one newline. The client did not
    // change the text next to it, thus the merge keeps it.
    expect(update.warnings).toEqual([]);
    expect(editor.getBlock("c")).toMatchObject({
      type: "codeBlock",
      props: { language: "javascript" },
      content: [{ text: "if (a) {\n  b();\n\n} // end" }],
    });
  });
});

describe("special characters at the edges of the text", () => {
  it("keeps a byte order mark that the document has", () => {
    const editor = BlockNoteEditor.create({
      initialContent: [{ type: "paragraph", content: "\uFEFFHello" }],
    });
    const text = getDocumentText(editor, plainTextFormat);
    const update = valid(
      computeOperations(editor, {
        base: "current",
        format: plainTextFormat,
        text,
      }),
    );
    expect(update.operations).toEqual([]);
  });

  it("accepts a document with all private use characters", () => {
    // The projection separates the blocks with a character that the text
    // does not contain (see `projectDocument`).
    let all = "";
    for (let code = 0xe000; code <= 0xf8ff; code++) {
      all += String.fromCharCode(code);
    }
    const editor = BlockNoteEditor.create({
      initialContent: [
        { type: "paragraph", content: "Hello" },
        { type: "paragraph", content: all },
      ],
    });
    const text = replaceOnce(
      getDocumentText(editor, plainTextFormat),
      "Hello",
      "Hello there",
    );
    valid(
      updateDocument(editor, {
        base: "current",
        format: plainTextFormat,
        text,
      }),
    );
    expect(getDocumentText(editor, plainTextFormat)).toBe(text);
  });
});

describe("an item that plain text does not show", () => {
  it("keeps a mention next to a word that the text changes", () => {
    const editor = BlockNoteEditor.create({
      schema: richSchema,
      initialContent: [
        {
          id: "p",
          type: "paragraph",
          content: [
            { type: "text", text: "Ask ", styles: {} },
            { type: "mention", props: { user: "Bob" } },
            { type: "text", text: "today please", styles: {} },
          ],
        },
      ] as PartialBlock<any, any, any>[],
    });
    const text = getDocumentText(editor, plainTextFormat);
    valid(
      updateDocument(editor, {
        base: "current",
        format: plainTextFormat,
        text: replaceOnce(text, "today", "tomorrow"),
      }),
    );
    expect(editor.getBlock("p")?.content).toMatchObject([
      { type: "text", text: "Ask " },
      { type: "mention", props: { user: "Bob" } },
      { type: "text", text: "tomorrow please" },
    ]);
  });
});
