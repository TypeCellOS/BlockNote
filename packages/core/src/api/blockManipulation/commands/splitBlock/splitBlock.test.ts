import { describe, expect, it } from "vitest";

import { getBlockInfoFromPos } from "../../../getBlockInfoFromPos.js";
import { setupTestEnv } from "../../setupTestEnv.js";
import { splitBlockCommand } from "./splitBlock.js";

const getEditor = setupTestEnv();

function splitBlock(
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

    splitBlock(getSelectionAnchorPosWithOffset(4));

    expect(getEditor().document).toMatchSnapshot();
  });

  it("End of content", () => {
    getEditor().setTextCursorPosition("paragraph-0");

    splitBlock(getSelectionAnchorPosWithOffset(11));

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Block has children", () => {
    getEditor().setTextCursorPosition("paragraph-with-children");

    splitBlock(getSelectionAnchorPosWithOffset(4));

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Keep type", () => {
    getEditor().setTextCursorPosition("heading-0");

    splitBlock(getSelectionAnchorPosWithOffset(4), true);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Don't keep type", () => {
    getEditor().setTextCursorPosition("heading-0");

    splitBlock(getSelectionAnchorPosWithOffset(4));

    expect(getEditor().document).toMatchSnapshot();
  });

  it.skip("Keep props", () => {
    getEditor().setTextCursorPosition("paragraph-with-props");

    splitBlock(getSelectionAnchorPosWithOffset(4), false, true);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Don't keep props", () => {
    getEditor().setTextCursorPosition("paragraph-with-props");

    splitBlock(getSelectionAnchorPosWithOffset(4));

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Selection is set", () => {
    getEditor().setTextCursorPosition("paragraph-0");

    splitBlock(getSelectionAnchorPosWithOffset(4));

    const { blockContainer } = getBlockInfoFromPos(
      getEditor()._tiptapEditor.state.doc,
      getEditor()._tiptapEditor.state.selection.anchor
    );

    const anchorIsAtStartOfNewBlock =
      blockContainer.node.attrs.id === "0" &&
      getEditor()._tiptapEditor.state.selection.$anchor.parentOffset === 0;

    expect(anchorIsAtStartOfNewBlock).toBeTruthy();
  });
});
