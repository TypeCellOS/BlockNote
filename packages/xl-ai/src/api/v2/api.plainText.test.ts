import type { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import {
  getDocumentText,
  plainTextFormat,
  updateDocumentFromText,
} from "./index.js";
import {
  blockFieldsById,
  createEditor,
  diffBlocks,
  documentShape,
  replaceOnce,
} from "./testUtil/fixtures.js";

function write(
  editor: BlockNoteEditor<any, any, any>,
  edit: (text: string) => string,
) {
  const text = edit(getDocumentText(editor, plainTextFormat));
  return updateDocumentFromText(editor, { format: plainTextFormat, text });
}

describe("plain text", () => {
  it("a heading with changed text stays a heading and keeps its styles", () => {
    const editor = createEditor();
    write(editor, (text) =>
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

  it("changes only the block with changed text", () => {
    const editor = createEditor();
    const before = blockFieldsById(editor);
    write(editor, (text) => replaceOnce(text, "A quote", "A quote, edited"));

    expect(diffBlocks(before, blockFieldsById(editor))).toEqual({
      changed: ["quote"],
      removed: [],
      added: [],
    });
    expect(editor.getBlock("quote")?.type).toBe("quote");
  });

  it("keeps nesting, and blocks without text (images, tables, empty paragraphs)", () => {
    const editor = createEditor();
    const shape = documentShape(editor.document);
    write(editor, (text) =>
      replaceOnce(text, "Last paragraph", "Last paragraph, edited"),
    );

    expect(documentShape(editor.document)).toEqual(shape);
  });

  it("inserts a new paragraph between blocks", () => {
    const editor = createEditor();
    write(editor, (text) =>
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
    write(editor, (text) =>
      replaceOnce(text, "line one\nline two", "line one\nline 2"),
    );

    expect(editor.getBlock("hard-break")?.content).toEqual([
      { type: "text", text: "line one\nline 2", styles: {} },
    ]);
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
    write(editor, (text) =>
      replaceOnce(
        text,
        "first.\n\nA nested",
        "first.\n\nNew note.\n\nA nested",
      ),
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

  it("a small change in each of many paragraphs keeps the ID and props of each paragraph", () => {
    const editor = createEditor(
      Array.from({ length: 300 }, (_, i) => ({
        id: `p${i}`,
        type: "paragraph" as const,
        props: { textColor: "red" },
        content: `Paragraph ${i} alpha beta gamma delta epsilon`,
      })),
    );
    const update = write(editor, (text) =>
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
});
