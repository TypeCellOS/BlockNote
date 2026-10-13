import { describe, expect, it } from "vite-plus/test";

import { setupTestEnv } from "../setupTestEnv.js";

const getEditor = setupTestEnv();

// Tab and Shift-Tab with a selection spanning two columns. There is no
// nestable range inside the column list — it holds only `column`s — so the
// range has to resolve outside it and move the list as a unit. Nesting used to
// resolve the range at the columns themselves, where the preconditions can
// never hold, making both keys silent no-ops.
describe("Nest & unnest a selection spanning two columns", () => {
  it("Nests the whole column list under its previous sibling", () => {
    const editor = getEditor();

    editor.setSelection("column-paragraph-1", "column-paragraph-2");

    expect(editor.canNestBlock()).toBe(true);
    editor.nestBlock();

    expect(editor.document.map((block) => block.id)).toEqual([
      "paragraph-0",
      "paragraph-1",
      "paragraph-2",
    ]);
    expect(editor.getBlock("paragraph-1")!.children.map((c) => c.id)).toEqual([
      "column-list-0",
    ]);
    // The list itself is untouched — only its position changed.
    expect(editor.getBlock("column-list-0")!.children.map((c) => c.id)).toEqual(
      ["column-0", "column-1"],
    );
  });

  // The slice `sinkItem` builds used to open into the last of the previous
  // sibling's children, which fails when that is a column list ("Cannot join
  // blockContainer onto columnList"). The block now goes after the list.
  it("Nests a block after a column list at the end of the previous sibling's children", () => {
    const editor = getEditor();

    editor.setSelection("column-paragraph-1", "column-paragraph-2");
    editor.nestBlock();
    expect(editor.getBlock("paragraph-1")!.children.map((c) => c.id)).toEqual([
      "column-list-0",
    ]);

    editor.setTextCursorPosition("paragraph-2", "start");
    expect(editor.canNestBlock()).toBe(true);
    editor.nestBlock();

    expect(editor.getBlock("paragraph-1")!.children.map((c) => c.id)).toEqual([
      "column-list-0",
      "paragraph-2",
    ]);
    expect(editor.getTextCursorPosition().block.id).toBe("paragraph-2");
    expect(() => editor.prosemirrorState.doc.check()).not.toThrow();
  });

  it("Unnests the whole column list out of its parent", () => {
    const editor = getEditor();

    editor.setSelection("column-paragraph-1", "column-paragraph-2");
    editor.nestBlock();

    editor.setSelection("column-paragraph-1", "column-paragraph-2");
    expect(editor.canUnnestBlock()).toBe(true);
    editor.unnestBlock();

    expect(editor.document.map((block) => block.id)).toEqual([
      "paragraph-0",
      "paragraph-1",
      "column-list-0",
      "paragraph-2",
    ]);
    expect(editor.getBlock("paragraph-1")!.children).toEqual([]);
    expect(editor.getBlock("column-list-0")!.children.map((c) => c.id)).toEqual(
      ["column-0", "column-1"],
    );
  });

  it("Reports no nesting when the column list has no previous sibling", () => {
    const editor = getEditor();
    editor.replaceBlocks(editor.document, [
      editor.getBlock("column-list-0")!,
      { id: "after", type: "paragraph", content: "After" },
    ]);

    editor.setSelection("column-paragraph-1", "column-paragraph-2");

    const before = editor.document;
    expect(editor.canNestBlock()).toBe(false);
    editor.nestBlock();
    expect(editor.document).toEqual(before);
  });
});
