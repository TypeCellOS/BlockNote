import { describe, expect, it } from "vitest";

import { getBlockInfoFromTransaction } from "../../../getBlockInfoFromPos.js";
import { setupTestEnv } from "../../setupTestEnv.js";
import { mergeBlocksCommand } from "./mergeBlocks.js";

const getEditor = setupTestEnv();

function mergeBlocks(posBetweenBlocks: number) {
  return getEditor()._tiptapEditor.commands.command(
    mergeBlocksCommand(posBetweenBlocks),
  );
}

function getPosBeforeSelectedBlock() {
  return getEditor().transact(
    (tr) => getBlockInfoFromTransaction(tr).bnBlock.beforePos,
  );
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
