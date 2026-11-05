// @vitest-environment node
import {
  type Block,
  BlockNoteEditor,
  type PartialBlock,
} from "@blocknote/core";
import type { Step } from "prosemirror-transform";
import { describe, expect, it } from "vite-plus/test";

import type { LensBlock } from "../blocks/types.js";

import { applyOperations } from "./applyOperations.js";
import type { BlockOperation } from "./types.js";
import { columnSchema } from "../testUtil/fixtures.js";

/** Applies the operations in one transaction of the editor, and returns its steps. */
function apply(
  editor: BlockNoteEditor<any, any, any>,
  operations: readonly BlockOperation[],
): readonly Step[] {
  let steps: readonly Step[] = [];
  editor.transact((tr) => {
    applyOperations(tr, operations);
    steps = [...tr.steps];
  });
  return steps;
}

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

describe("applyOperations", () => {
  it("applies the operations in sequence", () => {
    const editor = createEditor();
    apply(editor, [
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
    apply(editor, []);
    expect(editor.document).toEqual(before);
  });

  it("throws an error if an operation refers to a block that does not exist", () => {
    const editor = createEditor();
    expect(() =>
      apply(editor, [
        { type: "move", id: "a", reference: "missing", placement: "after" },
      ]),
    ).toThrow();
  });
});

describe("the steps of a structure change", () => {
  /** The kind of each step: an insert, a removal, or a replacement. */
  function kinds(steps: readonly Step[]) {
    return steps.map((step) => {
      const { from, to, slice } = step.toJSON() as {
        from: number;
        to: number;
        slice?: unknown;
      };
      if (from === to) {
        return "insert";
      }
      return slice === undefined ? "remove" : "replace";
    });
  }

  it("inserts a block with one step that only inserts", () => {
    const editor = createEditor();
    const steps = apply(editor, [
      {
        type: "insert",
        block: paragraph("new", "New"),
        reference: "a",
        placement: "after",
      },
    ]);
    expect(kinds(steps)).toEqual(["insert"]);
    expect(shape(editor.document)).toEqual(["A", "New", "B", "C"]);
  });

  it("moves a block with an insert step and a removal step", () => {
    const editor = createEditor();
    const steps = apply(editor, [
      { type: "move", id: "c", reference: "a", placement: "before" },
    ]);
    expect(kinds(steps)).toEqual(["insert", "remove"]);
    expect(shape(editor.document)).toEqual(["C", "A", "B"]);
  });

  it("removes the block group of a block without children", () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          id: "a",
          type: "paragraph",
          content: "A",
          children: [{ id: "child", type: "paragraph", content: "Child" }],
        },
      ],
    });
    const steps = apply(editor, [{ type: "delete", id: "child" }]);
    expect(kinds(steps)).toEqual(["remove"]);
    expect(shape(editor.document)).toEqual(["A"]);
  });

  it("keeps the minimum number of columns at each step", () => {
    const schema = columnSchema;
    const column = (id: string): LensBlock => ({
      id,
      type: "column",
      props: {},
      content: undefined,
      children: [paragraph(`${id}-text`, id)],
    });
    const editor = BlockNoteEditor.create({
      schema,
      initialContent: [
        {
          id: "list",
          type: "columnList",
          children: [column("k"), column("x"), column("y")],
        },
      ] as PartialBlock<any, any, any>[],
    });
    // The removal of x and y gives one column, if it comes before the
    // insert of the two new columns.
    apply(editor, [
      {
        type: "insert",
        block: column("n1"),
        reference: "k",
        placement: "before",
      },
      {
        type: "insert",
        block: column("n2"),
        reference: "k",
        placement: "before",
      },
      { type: "delete", id: "x" },
      { type: "delete", id: "y" },
    ]);
    expect(editor.document[0].children.map((block) => block.id)).toEqual([
      "n1",
      "n2",
      "k",
    ]);
  });
});
