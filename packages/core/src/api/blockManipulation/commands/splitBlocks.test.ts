import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { testDocument } from "../testDocument.js";
import { splitBlockCommand } from "./splitBlock.js";

let editor: BlockNoteEditor;
const div = document.createElement("div");

beforeAll(() => {
  editor = BlockNoteEditor.create();
  editor.mount(div);
});

afterAll(() => {
  editor.mount(undefined);
  editor._tiptapEditor.destroy();
  editor = undefined as any;
});

beforeEach(() => {
  editor.replaceBlocks(editor.document, testDocument);
});

function splitBlocks(
  posInBlock: number,
  keepType?: boolean,
  keepProps?: boolean
) {
  // TODO: Replace with imported function after converting from TipTap command
  editor._tiptapEditor.commands.command(
    splitBlockCommand(posInBlock, keepType, keepProps)
  );
}

function getSelectionAnchorPosWithOffset(offset: number) {
  return editor._tiptapEditor.state.selection.anchor + offset;
}

describe("Test splitBlocks", () => {
  it("Basic", () => {
    editor.setTextCursorPosition("paragraph-0");

    splitBlocks(getSelectionAnchorPosWithOffset(4));

    expect(editor.document).toMatchSnapshot();
  });

  it("Block has children", () => {
    editor.setTextCursorPosition("paragraph-with-children");

    splitBlocks(getSelectionAnchorPosWithOffset(4));

    expect(editor.document).toMatchSnapshot();
  });

  it("Keep type", () => {
    editor.setTextCursorPosition("heading-0");

    splitBlocks(getSelectionAnchorPosWithOffset(4), true);

    expect(editor.document).toMatchSnapshot();
  });

  it("Don't keep type", () => {
    editor.setTextCursorPosition("heading-0");

    splitBlocks(getSelectionAnchorPosWithOffset(4));

    expect(editor.document).toMatchSnapshot();
  });

  it.skip("Keep props", () => {
    editor.setTextCursorPosition("paragraph-with-props");

    splitBlocks(getSelectionAnchorPosWithOffset(4), true, true);

    expect(editor.document).toMatchSnapshot();
  });

  it("Don't keep props", () => {
    editor.setTextCursorPosition("paragraph-with-props");

    splitBlocks(getSelectionAnchorPosWithOffset(4));

    expect(editor.document).toMatchSnapshot();
  });
});
