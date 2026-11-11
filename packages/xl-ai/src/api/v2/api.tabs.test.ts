import type { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { getDocumentText, updateDocument } from "./api.js";
import {
  htmlFormat,
  markdownFormat,
  plainTextFormat,
  type TextFormat,
} from "./formats/index.js";
import type { LensBlock } from "./model.js";
import {
  createEditor,
  createTabsEditor,
  documentShape,
} from "./testUtil/fixtures.js";
import { blockToText } from "./util/blocks/text.js";
import { valid } from "./testUtil/valid.js";

/*
 * The tests of a tab set: a layout block that does not dissolve
 * (`children.dissolve: false`, see `createTabsEditor`). No format shows the
 * tabs, thus a client sees only the blocks in them.
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
