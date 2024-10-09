import { describe, expect, it } from "vitest";

import { setupTestEnv } from "../setupTestEnv.js";
import { splitBlockCommand } from "./splitBlock.js";

const getEditor = setupTestEnv();

function splitBlocks(
  posInBlock: number,
  keepType?: boolean,
  keepProps?: boolean
) {
  // TODO: Replace with imported function after converting from TipTap command
  getEditor()._tiptapEditor.commands.command(
    splitBlockCommand(posInBlock, keepType, keepProps)
  );
}

function getSelectionAnchorPosWithOffset(offset: number) {
  return getEditor()._tiptapEditor.state.selection.anchor + offset;
}

describe("Test splitBlocks", () => {
  it("Basic", () => {
    getEditor().setTextCursorPosition("paragraph-0");

    splitBlocks(getSelectionAnchorPosWithOffset(4));

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Block has children", () => {
    getEditor().setTextCursorPosition("paragraph-with-children");

    splitBlocks(getSelectionAnchorPosWithOffset(4));

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Keep type", () => {
    getEditor().setTextCursorPosition("heading-0");

    splitBlocks(getSelectionAnchorPosWithOffset(4), true);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Don't keep type", () => {
    getEditor().setTextCursorPosition("heading-0");

    splitBlocks(getSelectionAnchorPosWithOffset(4));

    expect(getEditor().document).toMatchSnapshot();
  });

  it.skip("Keep props", () => {
    getEditor().setTextCursorPosition("paragraph-with-props");

    splitBlocks(getSelectionAnchorPosWithOffset(4), false, true);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Don't keep props", () => {
    getEditor().setTextCursorPosition("paragraph-with-props");

    splitBlocks(getSelectionAnchorPosWithOffset(4));

    expect(getEditor().document).toMatchSnapshot();
  });
});
