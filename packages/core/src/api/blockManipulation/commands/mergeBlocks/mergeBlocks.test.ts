import { describe, expect, it } from "vite-plus/test";

import { getBlockInfoFromSelection } from "../../../getBlockInfoFromPos.js";
import { setupTestEnv } from "../../setupTestEnv.js";
import { getParentBlockInfo, mergeBlocksCommand } from "./mergeBlocks.js";

const getEditor = setupTestEnv();

function mergeBlocks(posBetweenBlocks: number) {
  return getEditor()._tiptapEditor.commands.command(
    mergeBlocksCommand(posBetweenBlocks),
  );
}

function getPosBeforeSelectedBlock() {
  return getEditor().transact(
    (tr) => getBlockInfoFromSelection(tr).bnBlock.beforePos,
  );
}

type Document = ReturnType<typeof getEditor>["document"];

// Block ids with their nesting, e.g. [["a", [["b", []]]]].
function outline(blocks: Document): unknown[] {
  return blocks.map((block) => [block.id, outline(block.children)]);
}

describe("Test mergeBlocks", () => {
  it("Basic", () => {
    getEditor().setTextCursorPosition("paragraph-1");

    mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("First block has children", () => {
    getEditor().setTextCursorPosition("paragraph-2");

    mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Second block has children", () => {
    getEditor().setTextCursorPosition("paragraph-with-children");

    mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Second block has children, first block is nested", () => {
    getEditor().replaceBlocks(getEditor().document, [
      {
        id: "a",
        type: "bulletListItem",
        content: "A",
        children: [{ id: "b", type: "bulletListItem", content: "B" }],
      },
      {
        id: "c",
        type: "paragraph",
        content: "C",
        children: [{ id: "d", type: "bulletListItem", content: "D" }],
      },
    ]);
    getEditor().setTextCursorPosition("c");

    mergeBlocks(getPosBeforeSelectedBlock());

    expect(outline(getEditor().document)).toEqual([
      [
        "a",
        [
          ["b", []],
          ["d", []],
        ],
      ],
    ]);
    expect(getEditor().getBlock("b")?.content).toEqual([
      { type: "text", text: "BC", styles: {} },
    ]);
  });

  it("Second block has children, first block is nested twice", () => {
    getEditor().replaceBlocks(getEditor().document, [
      {
        id: "a",
        type: "bulletListItem",
        content: "A",
        children: [
          {
            id: "b",
            type: "bulletListItem",
            content: "B",
            children: [{ id: "e", type: "bulletListItem", content: "E" }],
          },
        ],
      },
      {
        id: "c",
        type: "paragraph",
        content: "C",
        children: [{ id: "d", type: "bulletListItem", content: "D" }],
      },
    ]);
    getEditor().setTextCursorPosition("c");

    mergeBlocks(getPosBeforeSelectedBlock());

    expect(outline(getEditor().document)).toEqual([
      [
        "a",
        [
          ["b", [["e", []]]],
          ["d", []],
        ],
      ],
    ]);
    expect(getEditor().getBlock("e")?.content).toEqual([
      { type: "text", text: "EC", styles: {} },
    ]);
  });

  it("Second block is empty", () => {
    getEditor().setTextCursorPosition("empty-paragraph");

    mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Blocks have different types", () => {
    getEditor().setTextCursorPosition("paragraph-5");

    mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Selection is updated", () => {
    getEditor().setTextCursorPosition("paragraph-0", "end");

    const firstBlockEndOffset = getEditor().transact(
      (tr) => tr.selection.$anchor.parentOffset,
    );

    getEditor().setTextCursorPosition("paragraph-1");

    mergeBlocks(getPosBeforeSelectedBlock());

    const anchorIsAtOldFirstBlockEndPos =
      getEditor().transact((tr) => tr.selection.$anchor.parentOffset) ===
      firstBlockEndOffset;

    expect(anchorIsAtOldFirstBlockEndPos).toBeTruthy();
  });

  it("getParentBlockInfo returns undefined for top-level block", () => {
    getEditor().setTextCursorPosition("paragraph-0");

    const beforePos = getPosBeforeSelectedBlock();
    const doc = getEditor()._tiptapEditor.state.doc;
    const $pos = doc.resolve(beforePos);

    expect($pos.depth - 1).toBeLessThan(1);

    const result = getParentBlockInfo(doc, beforePos);

    expect(result).toBeUndefined();
  });

  // We expect a no-op for each of the remaining tests as merging should only
  // happen for blocks which both have inline content. We also expect
  // `mergeBlocks` to return false as TipTap commands should do that instead of
  // throwing an error, when the command cannot be executed.
  it("First block is empty", () => {
    getEditor().setTextCursorPosition("paragraph-8");

    const originalDocument = getEditor().document;
    const ret = mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toEqual(originalDocument);
    expect(ret).toBeFalsy();
  });

  it("Inline content & no content", () => {
    getEditor().setTextCursorPosition("image-0");

    const originalDocument = getEditor().document;
    const ret = mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toEqual(originalDocument);
    expect(ret).toBeFalsy();
  });

  it("Inline content & table content", () => {
    getEditor().setTextCursorPosition("table-0");

    const originalDocument = getEditor().document;
    const ret = mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toEqual(originalDocument);
    expect(ret).toBeFalsy();
  });

  it("No content & inline content", () => {
    getEditor().setTextCursorPosition("paragraph-6");

    const originalDocument = getEditor().document;
    const ret = mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toEqual(originalDocument);
    expect(ret).toBeFalsy();
  });

  it("Table content & inline content", () => {
    getEditor().setTextCursorPosition("paragraph-7");

    const originalDocument = getEditor().document;
    const ret = mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toEqual(originalDocument);
    expect(ret).toBeFalsy();
  });
});
