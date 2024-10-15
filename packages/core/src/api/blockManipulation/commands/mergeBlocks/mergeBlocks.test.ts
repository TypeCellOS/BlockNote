import { describe, expect, it } from "vitest";

import { getBlockInfoFromSelection } from "../../../getBlockInfoFromPos.js";
import { setupTestEnv } from "../../setupTestEnv.js";
import { mergeBlocksCommand } from "./mergeBlocks.js";

const getEditor = setupTestEnv();

function mergeBlocks(posBetweenBlocks: number) {
  // TODO: Replace with imported function after converting from TipTap command
  getEditor()._tiptapEditor.commands.command(
    mergeBlocksCommand(posBetweenBlocks)
  );
}

function getPosBeforeSelectedBlock() {
  return getBlockInfoFromSelection(getEditor()._tiptapEditor.state)
    .blockContainer.beforePos;
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

  it("Blocks have different types", () => {
    getEditor().setTextCursorPosition("paragraph-5");

    mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Inline content & no content", () => {
    getEditor().setTextCursorPosition("image-0");

    mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Inline content & table content", () => {
    getEditor().setTextCursorPosition("table-0");

    mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("No content & inline content", () => {
    getEditor().setTextCursorPosition("paragraph-6");

    mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Table content & inline content", () => {
    getEditor().setTextCursorPosition("paragraph-7");

    mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Selection is set", () => {
    getEditor().setTextCursorPosition("paragraph-0", "end");

    const firstBlockEndOffset =
      getEditor()._tiptapEditor.state.selection.$anchor.parentOffset;

    getEditor().setTextCursorPosition("paragraph-1");

    mergeBlocks(getPosBeforeSelectedBlock());

    const anchorIsAtOldFirstBlockEndPos =
      getEditor()._tiptapEditor.state.selection.$anchor.parentOffset ===
      firstBlockEndOffset;

    expect(anchorIsAtOldFirstBlockEndPos).toBeTruthy();
  });
});
