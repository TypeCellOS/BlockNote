import { type Block, BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { applyBlockOperations } from "./applyOperations.js";

function createEditor() {
  return BlockNoteEditor.create({
    initialContent: [
      { id: "a", type: "paragraph", content: "A" },
      { id: "b", type: "paragraph", content: "B" },
      { id: "c", type: "paragraph", content: "C" },
    ],
  });
}

/** The text of each block, with the children nested. */
function shape(blocks: Block<any, any, any>[]): unknown[] {
  return blocks.map((block) => {
    const text = (block.content as { text: string }[])
      .map((item) => item.text)
      .join("");
    return block.children.length > 0 ? [text, shape(block.children)] : text;
  });
}

const text = (value: string) => [
  { type: "text" as const, text: value, styles: {} },
];

const paragraph = (id: string, value: string) => ({
  id,
  type: "paragraph",
  props: {},
  content: text(value),
  children: [],
});

describe("applyBlockOperations", () => {
  it("applies the operations in sequence", () => {
    const editor = createEditor();
    applyBlockOperations(editor, [
      { type: "update", id: "a", update: { content: text("A2") } },
      {
        type: "insert",
        block: paragraph("new", "New"),
        reference: "a",
        placement: "after",
      },
      {
        type: "insert",
        block: paragraph("child", "Child"),
        reference: "new",
        placement: "first-child",
      },
      { type: "move", id: "c", reference: "a", placement: "before" },
      { type: "delete", id: "b" },
    ]);

    expect(shape(editor.document)).toEqual(["C", "A2", ["New", ["Child"]]]);
    expect(editor.document.map((block) => block.id).slice(0, 3)).toEqual([
      "c",
      "a",
      "new",
    ]);
  });

  it("does not change the document for an empty list", () => {
    const editor = createEditor();
    const before = editor.document;
    applyBlockOperations(editor, []);
    expect(editor.document).toEqual(before);
  });

  it("throws an error if an operation refers to a block that does not exist", () => {
    const editor = createEditor();
    expect(() =>
      applyBlockOperations(editor, [
        { type: "move", id: "a", reference: "missing", placement: "after" },
      ]),
    ).toThrow();
  });
});
