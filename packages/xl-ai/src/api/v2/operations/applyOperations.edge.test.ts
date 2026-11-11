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
