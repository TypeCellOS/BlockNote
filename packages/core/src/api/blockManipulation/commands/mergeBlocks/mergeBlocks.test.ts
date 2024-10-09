import { describe, expect, it } from "vitest";

import { getBlockInfoFromPos } from "../../../getBlockInfoFromPos.js";
import { setupTestEnv } from "../../setupTestEnv.js";
import { mergeBlocksCommand } from "./mergeBlocks.js";

const getEditor = setupTestEnv();

function mergeBlocks(posBetweenBlocks: number) {
  // TODO: Replace with imported function after converting from TipTap command
  getEditor()._tiptapEditor.commands.command(
    mergeBlocksCommand(posBetweenBlocks)
  );
}

function getPosAfterSelectedBlock() {
  const { startPos } = getBlockInfoFromPos(
    getEditor()._tiptapEditor.state.doc,
    getEditor()._tiptapEditor.state.selection.from
  );
  return getEditor()._tiptapEditor.state.doc.resolve(startPos).after();
}

describe("Test mergeBlocks", () => {
  it("Basic", () => {
    getEditor().setTextCursorPosition("paragraph-0");

    mergeBlocks(getPosAfterSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("First block has children", () => {
    getEditor().setTextCursorPosition("paragraph-with-children");

    mergeBlocks(getPosAfterSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Second block has children", () => {
    getEditor().setTextCursorPosition("paragraph-1");

    mergeBlocks(getPosAfterSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Blocks have different types", () => {
    getEditor().setTextCursorPosition("heading-0");

    mergeBlocks(getPosAfterSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Inline content & no content", () => {
    getEditor().setTextCursorPosition("paragraph-5");

    mergeBlocks(getPosAfterSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it.skip("Inline content & table content", () => {
    getEditor().setTextCursorPosition("paragraph-6");

    mergeBlocks(getPosAfterSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("No content & inline content", () => {
    getEditor().setTextCursorPosition("image-0");

    mergeBlocks(getPosAfterSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it.skip("Table content & inline content", () => {
    getEditor().setTextCursorPosition("table-0");

    mergeBlocks(getPosAfterSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });
});
