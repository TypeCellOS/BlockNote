import { describe, expect, it } from "vitest";

import { getBlockInfoFromSelection } from "../../../getBlockInfoFromPos.js";
import { setupTestEnv } from "../../setupTestEnv.js";
import { mergeBlocksCommand } from "./mergeBlocks.js";

const getEditor = setupTestEnv();

function mergeBlocks(posBetweenBlocks: number) {
  return getEditor()._tiptapEditor.commands.command(
    mergeBlocksCommand(posBetweenBlocks)
  );
}

function getPosBeforeSelectedBlock() {
  return getBlockInfoFromSelection(getEditor()._tiptapEditor.state).bnBlock
    .beforePos;
}

describe("Test mergeBlocks", () => {
  it("Basic", () => {
    getEditor().setSelection("paragraph-1");

    mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("First block has children", () => {
    getEditor().setSelection("paragraph-2");

    mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Second block has children", () => {
    getEditor().setSelection("paragraph-with-children");

    mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Second block is empty", () => {
    getEditor().setSelection("empty-paragraph");

    mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Blocks have different types", () => {
    getEditor().setSelection("paragraph-5");

    mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Selection is updated", () => {
    getEditor().setSelection({
      block: "paragraph-0",
      selectionType: "collapsedEnd",
    });

    const firstBlockEndOffset =
      getEditor()._tiptapEditor.state.selection.$anchor.parentOffset;

    getEditor().setSelection("paragraph-1");

    mergeBlocks(getPosBeforeSelectedBlock());

    const anchorIsAtOldFirstBlockEndPos =
      getEditor()._tiptapEditor.state.selection.$anchor.parentOffset ===
      firstBlockEndOffset;

    expect(anchorIsAtOldFirstBlockEndPos).toBeTruthy();
  });

  // We expect a no-op for each of the remaining tests as merging should only
  // happen for blocks which both have inline content. We also expect
  // `mergeBlocks` to return false as TipTap commands should do that instead of
  // throwing an error, when the command cannot be executed.
  it("First block is empty", () => {
    getEditor().setSelection("paragraph-8");

    const originalDocument = getEditor().document;
    const ret = mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toEqual(originalDocument);
    expect(ret).toBeFalsy();
  });

  it("Inline content & no content", () => {
    getEditor().setSelection("image-0");

    const originalDocument = getEditor().document;
    const ret = mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toEqual(originalDocument);
    expect(ret).toBeFalsy();
  });

  it("Inline content & table content", () => {
    getEditor().setSelection("table-0");

    const originalDocument = getEditor().document;
    const ret = mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toEqual(originalDocument);
    expect(ret).toBeFalsy();
  });

  it("No content & inline content", () => {
    getEditor().setSelection("paragraph-6");

    const originalDocument = getEditor().document;
    const ret = mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toEqual(originalDocument);
    expect(ret).toBeFalsy();
  });

  it("Table content & inline content", () => {
    getEditor().setSelection("paragraph-7");

    const originalDocument = getEditor().document;
    const ret = mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toEqual(originalDocument);
    expect(ret).toBeFalsy();
  });
});
