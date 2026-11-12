import { type Block, BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import {
  type ChangeOperations,
  type DocumentChange,
  getDocumentText,
  updateDocument,
} from "./api.js";
import {
  htmlFormat,
  markdownFormat,
  plainTextFormat,
  type TextFormat,
} from "./formats/index.js";
import type { LensBlock } from "./model.js";
import {
  columnSchema,
  createColumnsEditor,
  createEditor,
  createTabsEditor,
  documentShape,
} from "./testUtil/fixtures.js";
import { blockToText } from "./util/blocks/text.js";
import { valid } from "./testUtil/valid.js";

/*
 * The tests of layout blocks: column lists and tab sets. A tab set is a
 * layout block that does not dissolve (`children.dissolve: false`, see
 * `createTabsEditor`). No format shows the tabs, thus a client sees only the
 * blocks in them. Markdown and plain text also do not show the columns.
 */

/** The text of top-level paragraphs in the format: the text of a client. */
function paragraphs(format: TextFormat, texts: readonly string[]): string {
  return getDocumentText(
    createEditor(texts.map((text) => ({ type: "paragraph", content: text }))),
    format,
  );
}

function write(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  texts: readonly string[],
) {
  return valid(
    updateDocument(editor, {
      base: "current",
      format,
      text: paragraphs(format, texts),
    }),
  );
}

/** The text of each block that the next read of a client shows, in order. */
function shownTexts(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
): string[] {
  const flat = (blocks: readonly LensBlock[]): string[] =>
    blocks.flatMap((block) => [blockToText(block), ...flat(block.children)]);
  return flat(format.parse(editor, getDocumentText(editor, format)));
}

/** The texts of the children of the block with the ID. */
function childTexts(editor: BlockNoteEditor<any, any, any>, id: string) {
  return (editor.getBlock(id)!.children as LensBlock[]).map(blockToText);
}

/** The type and the content of each child of the block with the ID. */
function childContents(editor: BlockNoteEditor<any, any, any>, id: string) {
  return editor
    .getBlock(id)!
    .children.map((block) => [block.type, block.content]);
}

/**
 * A tab set with at least two tabs, and three tabs: t1 with "One" (block a),
 * t2 with "Two" (block b), and t3 with "Three" (block c).
 */
function createThreeTabsEditor() {
  const editor = createTabsEditor(2);
  editor.insertBlocks(
    [
      {
        id: "t3",
        type: "tab",
        children: [{ id: "c", type: "paragraph", content: "Three" }],
      },
    ],
    "t2",
    "after",
  );
  return editor;
}

describe.each([
  { name: "markdown", format: markdownFormat, showsEmptyParagraph: true },
  { name: "HTML", format: htmlFormat, showsEmptyParagraph: true },
  { name: "plain text", format: plainTextFormat, showsEmptyParagraph: false },
])("a tab set in $name", ({ format, showsEmptyParagraph }) => {
  it("shows the blocks of the tabs, without the tabs", () => {
    expect(shownTexts(createTabsEditor(), format)).toEqual(["One", "Two"]);
  });

  it("changes a block in its tab", () => {
    const editor = createTabsEditor();
    const { operations } = write(editor, format, ["One!", "Two"]);
    expect(operations.map((operation) => operation.type)).toEqual(["update"]);
    expect(documentShape(editor.document)).toEqual([
      "set",
      ["t1", ["a"], "t2", ["b"]],
    ]);
    expect(childTexts(editor, "t1")).toEqual(["One!"]);
  });

  it("adds a new block between two tabs to the next tab", () => {
    // The text cannot show the tab of the new block. A new block goes into
    // the nesting of the next block (see "Target" in the README).
    const editor = createTabsEditor();
    write(editor, format, ["One", "New", "Two"]);
    expect(childTexts(editor, "t1")).toEqual(["One"]);
    expect(childTexts(editor, "t2")).toEqual(["New", "Two"]);
  });

  it("adds a new block after the last block to after the tab set", () => {
    const editor = createTabsEditor();
    write(editor, format, ["One", "Two", "End"]);
    expect(editor.document.map((block) => block.type)).toEqual([
      "tabs",
      "paragraph",
    ]);
    expect(documentShape([editor.document[0]])).toEqual([
      "set",
      ["t1", ["a"], "t2", ["b"]],
    ]);
  });

  it("moves the tabs with their blocks if the text swaps the blocks", () => {
    const editor = createTabsEditor();
    write(editor, format, ["Two", "One"]);
    expect(documentShape(editor.document)).toEqual([
      "set",
      ["t2", ["b"], "t1", ["a"]],
    ]);
  });

  it("removes a tab whose blocks the text removes, and keeps the tab set", () => {
    // A tab without blocks stays in the editor (core fills it with an empty
    // paragraph), but then the text would show that paragraph. Thus, the
    // tab goes, and PutGet is true.
    const editor = createTabsEditor();
    write(editor, format, ["Two"]);
    expect(documentShape(editor.document)).toEqual(["set", ["t2", ["b"]]]);
    expect(shownTexts(editor, format)).toEqual(["Two"]);
  });

  it("removes the tab set if the text removes all its blocks", () => {
    // The text has nothing of the tab set, thus it goes (PutGet is true).
    const editor = createTabsEditor();
    write(editor, format, ["After"]);
    expect(editor.document.map((block) => block.type)).toEqual(["paragraph"]);
    expect(shownTexts(editor, format)).toEqual(["After"]);
  });

  it("keeps an empty tab if the tab set needs it for its minimum", () => {
    // The schema wins: the tab set needs two tabs. Tab t1 stays, and the
    // apply gives it an empty paragraph, as the editor does. Thus, the next
    // read shows that paragraph if the format shows empty paragraphs
    // (then PutGet is not true).
    const editor = createTabsEditor(2);
    write(editor, format, ["Two"]);
    expect(editor.document[0].children.map((tab) => tab.id)).toEqual([
      "t1",
      "t2",
    ]);
    expect(childContents(editor, "t1")).toEqual([["paragraph", []]]);
    expect(shownTexts(editor, format)).toEqual(
      showsEmptyParagraph ? ["", "Two"] : ["Two"],
    );
  });

  it(
    showsEmptyParagraph
      ? "KNOWN LIMIT: a second write of the same text gives the empty tab a new empty paragraph"
      : "a second write of the same text does not change the document",
    () => {
      // The text does not have the empty paragraph of t1, thus the write
      // removes it, and the apply fills t1 again: the document is the same,
      // except the ID of the empty paragraph. Plain text does not show an
      // empty paragraph, thus there the text is unchanged.
      const editor = createTabsEditor(2);
      write(editor, format, ["Two"]);
      const [filler] = editor.getBlock("t1")!.children;
      const { operations } = write(editor, format, ["Two"]);
      expect(operations.map((operation) => operation.type)).toEqual(
        showsEmptyParagraph ? ["delete"] : [],
      );
      expect(childContents(editor, "t1")).toEqual([["paragraph", []]]);
      expect(editor.getBlock("t1")!.children[0].id === filler.id).toBe(
        !showsEmptyParagraph,
      );
    },
  );
});

describe("a tab set in JSON", () => {
  it("removes a tab that the JSON does not have", () => {
    const editor = createTabsEditor();
    const [set] = editor.document;
    valid(
      updateDocument(editor, {
        base: "current",
        document: [{ ...set, children: [set.children[1]] }],
      }),
    );
    expect(documentShape(editor.document)).toEqual(["set", ["t2", ["b"]]]);
  });

  it("gives invalid-document for a tab set with fewer tabs than its minimum", () => {
    // The client gives a valid document; the lens does not repair it (see
    // `parseJSON`).
    const editor = createTabsEditor(2);
    const before = editor.document;
    const [set] = before;
    expect(
      updateDocument(editor, {
        base: "current",
        document: [{ ...set, children: [set.children[1]] }],
      }),
    ).toEqual({ error: "invalid-document" });
    expect(editor.document).toEqual(before);
  });

  it("gives invalid-document for a tab without blocks", () => {
    const editor = createTabsEditor();
    const before = editor.document;
    const [set] = before;
    expect(
      updateDocument(editor, {
        base: "current",
        document: [
          {
            ...set,
            children: [{ ...set.children[0], children: [] }, set.children[1]],
          },
        ],
      }),
    ).toEqual({ error: "invalid-document" });
    expect(editor.document).toEqual(before);
  });
});

describe("a tab set, writes from a version", () => {
  it("keeps the changes of two writers in two tabs", () => {
    const editor = createTabsEditor();
    const version = structuredClone(editor.document) as LensBlock[];
    editor.updateBlock("b", { content: "Two!" });
    valid(
      updateDocument(editor, {
        base: version,
        format: markdownFormat,
        text: "One!\n\nTwo\n",
      }),
    );
    expect(documentShape(editor.document)).toEqual([
      "set",
      ["t1", ["a"], "t2", ["b"]],
    ]);
    expect(getDocumentText(editor, markdownFormat)).toBe("One!\n\nTwo!\n");
  });

  it("keeps an empty tab if another writer removed a tab and too few stay", () => {
    // The client removes the blocks of t3, and another writer removed t2.
    // The set needs two tabs, thus t3 stays with an empty paragraph.
    const editor = createThreeTabsEditor();
    const version = structuredClone(editor.document) as LensBlock[];
    editor.removeBlocks(["t2"]);
    valid(
      updateDocument(editor, {
        base: version,
        format: markdownFormat,
        text: "One\n\nTwo\n",
      }),
    );
    expect(editor.document[0].children.map((tab) => tab.id)).toEqual([
      "t1",
      "t3",
    ]);
    expect(childContents(editor, "t3")).toEqual([["paragraph", []]]);
  });

  it("adds an empty tab if two writers remove tabs and too few stay", () => {
    // The client removes t3 (in JSON), and another writer removed t2. The
    // merge keeps only t1, thus the schema adds a tab at the end.
    const editor = createThreeTabsEditor();
    const version = structuredClone(editor.document) as LensBlock[];
    editor.removeBlocks(["t2"]);
    valid(
      updateDocument(editor, {
        base: version,
        document: [
          { ...version[0], children: version[0].children.slice(0, 2) },
        ],
      }),
    );
    const [set] = editor.document;
    expect(set.children.map((tab) => tab.type)).toEqual(["tab", "tab"]);
    expect(documentShape([set.children[0]])).toEqual(["t1", ["a"]]);
    expect(childContents(editor, set.children[1].id)).toEqual([
      ["paragraph", []],
    ]);
  });
});

describe("a column list in markdown", () => {
  it("swaps two columns if the text swaps their blocks, without a new column", () => {
    const editor = createColumnsEditor();

    const update = valid(
      updateDocument(editor, {
        base: "current",
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
      updateDocument(editor, {
        base: "current",
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
      updateDocument(editor, {
        base: "current",
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
      updateDocument(editor, {
        base: "current",
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

    valid(
      updateDocument(editor, {
        base: "current",
        format: markdownFormat,
        text: "Alpha\n\nXray\n\nBeta\n",
      }),
    );

    expect(getDocumentText(editor, markdownFormat)).toBe(
      "Alpha\n\nXray\n\nBeta\n",
    );
    // Xray goes before Beta, into its column.
    expect(documentShape(editor.document)).toEqual([
      "list",
      ["c1", ["a"], "c2", ["x", "b"]],
    ]);
  });

  describe("moves of blocks in columns", () => {
    function createEditorWithTwoBlocksInEachColumn() {
      return BlockNoteEditor.create({
        schema: columnSchema,
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
    it("moves a block of a column to the start, out of the column list", () => {
      const editor = createEditorWithTwoBlocksInEachColumn();

      valid(
        updateDocument(editor, {
          base: "current",
          format: markdownFormat,
          text: "Bravo two\n\nTop\n\nAlpha one\n\nAlpha two\n\nBravo one\n\nEnd\n",
        }),
      );

      expect(documentShape(editor.document)).toEqual([
        "b2",
        "top",
        "list",
        ["cA", ["a1", "a2"], "cB", ["b1"]],
        "end",
      ]);
    });

    it("keeps the other blocks of the columns if the text swaps two blocks of two columns", () => {
      const editor = createEditorWithTwoBlocksInEachColumn();

      valid(
        updateDocument(editor, {
          base: "current",
          format: markdownFormat,
          text: "Top\n\nAlpha one\n\nBravo one\n\nAlpha two\n\nBravo two\n\nEnd\n",
        }),
      );

      expect(getDocumentText(editor, markdownFormat)).toBe(
        "Top\n\nAlpha one\n\nBravo one\n\nAlpha two\n\nBravo two\n\nEnd\n",
      );
      // The blocks that the text did not move stay in their columns. The
      // moved block goes into the column of the next block.
      expect(documentShape(editor.document)).toEqual([
        "top",
        "list",
        ["cA", ["a1"], "cB", ["b1", "a2", "b2"]],
        "end",
      ]);
    });
  });
});

describe("a column list in HTML", () => {
  it("puts two paragraphs into a new column list, without extra columns", () => {
    const editor = BlockNoteEditor.create({
      schema: columnSchema,
      initialContent: [
        { id: "a", type: "paragraph", content: "Alpha" },
        { id: "b", type: "paragraph", content: "Beta" },
      ],
    });

    valid(
      updateDocument(editor, {
        base: "current",
        format: htmlFormat,
        text: '<div class="bn-block-column-list"><div class="bn-block-column"><p>Alpha</p></div><div class="bn-block-column"><p>Beta</p></div></div>',
      }),
    );

    expect(editor.document).toHaveLength(1);
    expect(
      editor.document[0].children.map((column) =>
        column.children.map((block) => block.id),
      ),
    ).toEqual([["a"], ["b"]]);
  });
});

const initial = [
  { id: "a", type: "paragraph" as const, content: "Alpha" },
  { id: "b", type: "paragraph" as const, content: "Beta" },
  { id: "c", type: "paragraph" as const, content: "Gamma" },
];

/** The document of a client: a copy that the client can change. */
function copy(blocks: Block<any, any, any>[]): Block<any, any, any>[] {
  return JSON.parse(JSON.stringify(blocks));
}

/** Applies the JSON, and fails the test if the result is an error. */
function update(
  editor: Parameters<typeof updateDocument>[0],
  options: DocumentChange,
): ChangeOperations {
  return valid(updateDocument(editor, options));
}

describe("a column list in JSON", () => {
  it("gives an error for a column outside a column list", () => {
    const editor = BlockNoteEditor.create({
      schema: columnSchema,
      initialContent: initial,
    });

    expect(
      updateDocument(editor, {
        base: "current",
        document: [
          {
            type: "column",
            children: [{ type: "paragraph", content: "In a column" }],
          },
        ],
      }),
    ).toEqual({ error: "invalid-document" });
  });

  it("puts two blocks into a new column list, without extra columns", () => {
    const editor = BlockNoteEditor.create({
      schema: columnSchema,
      initialContent: initial.slice(0, 2),
    });
    const [a, b] = copy(editor.document);

    update(editor, {
      base: "current",
      document: [
        {
          type: "columnList",
          children: [
            { type: "column", children: [a] },
            { type: "column", children: [b] },
          ],
        },
      ],
    });

    expect(editor.document).toHaveLength(1);
    expect(
      editor.document[0].children.map((column) =>
        column.children.map((block) => block.id),
      ),
    ).toEqual([["a"], ["b"]]);
  });
});

describe("JSON, the layout rules", () => {
  it("gives an error for a column that the JSON empties: the client gives a valid layout", () => {
    const editor = createColumnsEditor();
    const before = editor.document;
    const [list] = editor.document;
    const [first, second] = list.children;

    // An empty column does not fit the schema: the conversion would fill it.
    expect(
      updateDocument(editor, {
        base: "current",
        document: [
          {
            ...list,
            children: [
              {
                ...first,
                children: [...first.children, ...second.children],
              },
              { ...second, children: [] },
            ],
          },
        ],
      }),
    ).toEqual({ error: "invalid-document" });
    expect(editor.document).toEqual(before);
  });
});
