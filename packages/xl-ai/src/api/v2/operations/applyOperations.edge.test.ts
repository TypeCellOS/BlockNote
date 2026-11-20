import type { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import type { LensTableContent } from "../model.js";
import { createEditor, createTabsEditor } from "../testUtil/fixtures.js";
import { applyOperations } from "./applyOperations.js";
import type { BlockOperation } from "./types.js";

function table(colors: string[]): PartialBlock {
  return {
    id: "t",
    type: "table",
    content: {
      type: "tableContent",
      rows: [
        {
          cells: colors.map((color, i) => ({
            type: "tableCell",
            content: `cell ${i}`,
            props: { backgroundColor: color },
          })),
        },
      ],
    },
  } as PartialBlock;
}

function apply(
  editor: BlockNoteEditor<any, any, any>,
  operations: BlockOperation[],
) {
  editor.transact((tr) => {
    applyOperations(tr, operations);
  });
}

describe("applyOperations: an update of a table", () => {
  it("changes the color of one cell, and keeps the text of each cell", () => {
    const editor = createEditor([table(["default", "default"])]);
    const content = editor.getBlock("t")!.content as LensTableContent;
    const cells = content.rows[0].cells as {
      props: Record<string, unknown>;
    }[];
    const changed = {
      ...content,
      rows: [
        {
          cells: [
            {
              ...cells[0],
              props: { ...cells[0].props, backgroundColor: "red" },
            },
            cells[1],
          ],
        },
      ],
    } as LensTableContent;

    apply(editor, [{ type: "update", id: "t", update: { content: changed } }]);

    const result = (editor.getBlock("t")!.content as LensTableContent).rows[0]
      .cells as { props: Record<string, unknown>; content: unknown }[];
    expect(result.map((cell) => cell.props.backgroundColor)).toEqual([
      "red",
      "default",
    ]);
    expect(
      result.map((cell) => (cell.content as { text: string }[])[0].text),
    ).toEqual(["cell 0", "cell 1"]);
  });
});

describe("applyOperations: invalid operations", () => {
  it("throws for an update of a block that is not in the document", () => {
    const editor = createEditor([{ id: "p", type: "paragraph" }]);
    expect(() =>
      apply(editor, [{ type: "update", id: "x", update: { type: "heading" } }]),
    ).toThrow("Block x is not in the document");
  });
});

describe("applyOperations: the updates apply before the structure operations", () => {
  const blocks: PartialBlock[] = [
    { id: "a", type: "paragraph", content: "Alpha" },
    { id: "b", type: "paragraph", content: "Beta" },
  ];
  const beta2 = [{ type: "text" as const, text: "Beta 2", styles: {} }];

  it("applies an update to a block that an earlier operation of the list removes", () => {
    // In the sequence of the list, block b is not in the document when its
    // update runs. The update applies first, thus the list does not throw.
    const editor = createEditor(blocks);
    apply(editor, [
      { type: "delete", id: "b" },
      { type: "update", id: "b", update: { content: beta2 } },
    ]);

    expect(editor.document.map((block) => block.id)).toEqual(["a"]);
  });

  it("applies an update that comes after a move of its block in the list", () => {
    const editor = createEditor(blocks);
    apply(editor, [
      { type: "move", id: "b", placement: "start" },
      { type: "update", id: "b", update: { content: beta2 } },
    ]);

    expect(editor.document).toMatchObject([
      { id: "b", content: [{ text: "Beta 2" }] },
      { id: "a", content: [{ text: "Alpha" }] },
    ]);
  });

  it("throws for an update of a block that an insert of the same list adds", () => {
    const editor = createEditor(blocks);
    expect(() =>
      apply(editor, [
        {
          type: "insert",
          block: {
            id: "new",
            type: "paragraph",
            props: {},
            content: [],
            children: [],
          },
          reference: "a",
          placement: "after",
        },
        { type: "update", id: "new", update: { content: beta2 } },
      ]),
    ).toThrow("Block new is not in the document");
  });
});

describe("applyOperations: an insert with the ID of a removed block", () => {
  it("throws, and does not give the removed block its old content at the new place", () => {
    // Without the check, the apply found the old node of block b, and the
    // result was the old paragraph at the new place: the type and the
    // content of the insert were lost, without an error.
    const editor = createEditor([
      { id: "a", type: "paragraph", content: "Alpha" },
      { id: "b", type: "paragraph", content: "Beta" },
    ]);
    expect(() =>
      apply(editor, [
        { type: "delete", id: "b" },
        {
          type: "insert",
          block: {
            id: "b",
            type: "heading",
            props: { level: 2 },
            content: [{ type: "text", text: "New heading", styles: {} }],
            children: [],
          },
          placement: "start",
        },
      ]),
    ).toThrow("Block b is a block that an earlier operation removed");
    expect(editor.document).toMatchObject([
      { id: "a", content: [{ text: "Alpha" }] },
      { id: "b", type: "paragraph", content: [{ text: "Beta" }] },
    ]);
  });
});

describe("applyOperations: a layout block with too few children", () => {
  it("adds the fill of the schema at the end of a tab set with fewer tabs than its minimum", () => {
    // The tab set needs two tabs. The removal of t2 leaves one, thus the
    // schema adds a tab with an empty paragraph, as in the editor.
    const editor = createTabsEditor(2);
    apply(editor, [{ type: "delete", id: "t2" }]);
    const [set] = editor.document;
    expect(set.children.map((tab) => tab.type)).toEqual(["tab", "tab"]);
    expect(set.children[0].id).toBe("t1");
    expect(
      set.children[1].children.map((block) => [block.type, block.content]),
    ).toEqual([["paragraph", []]]);
  });
});
