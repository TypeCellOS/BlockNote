import { describe, expect, it } from "vite-plus/test";

import { updateDocument } from "./api.js";
import type { LensBlock } from "./model.js";
import { createTabsEditor, documentShape } from "./testUtil/fixtures.js";
import { valid } from "./testUtil/valid.js";

/**
 * A tab set with at least two tabs and three tabs: t1 with "One" (block a),
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

describe("a tab set (a layout block that does not dissolve), writes from a version", () => {
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
    expect(set.children.map((tab) => tab.id)[0]).toBe("t1");
    expect(set.children.map((tab) => tab.type)).toEqual(["tab", "tab"]);
    expect(documentShape([set.children[0]])).toEqual(["t1", ["a"]]);
    expect(
      set.children[1].children.map((block) => [block.type, block.content]),
    ).toEqual([["paragraph", []]]);
  });
});
