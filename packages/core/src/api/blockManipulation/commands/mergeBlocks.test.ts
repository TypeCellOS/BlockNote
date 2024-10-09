import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { getBlockInfoFromPos } from "../../getBlockInfoFromPos.js";
import { testDocument } from "../testDocument.js";
import { mergeBlocksCommand } from "./mergeBlocks.js";

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

function mergeBlocks(posBetweenBlocks: number) {
  // TODO: Replace with imported function after converting from TipTap command
  editor._tiptapEditor.commands.command(mergeBlocksCommand(posBetweenBlocks));
}

function getPosAfterSelectedBlock() {
  const { startPos } = getBlockInfoFromPos(
    editor._tiptapEditor.state.doc,
    editor._tiptapEditor.state.selection.from
  );
  return editor._tiptapEditor.state.doc.resolve(startPos).after();
}

describe("Test mergeBlocks", () => {
  it("Basic", () => {
    editor.setTextCursorPosition("paragraph-0");

    mergeBlocks(getPosAfterSelectedBlock());

    expect(editor.document).toMatchSnapshot();
  });

  it("First block has children", () => {
    editor.setTextCursorPosition("paragraph-with-children");

    mergeBlocks(getPosAfterSelectedBlock());

    expect(editor.document).toMatchSnapshot();
  });

  it("Second block has children", () => {
    editor.setTextCursorPosition("paragraph-1");

    mergeBlocks(getPosAfterSelectedBlock());

    expect(editor.document).toMatchSnapshot();
  });

  it("Blocks have different types", () => {
    editor.setTextCursorPosition("heading-0");

    mergeBlocks(getPosAfterSelectedBlock());

    expect(editor.document).toMatchSnapshot();
  });

  it("Inline content & no content", () => {
    editor.setTextCursorPosition("paragraph-5");

    mergeBlocks(getPosAfterSelectedBlock());

    expect(editor.document).toMatchSnapshot();
  });

  it.skip("Inline content & table content", () => {
    editor.setTextCursorPosition("paragraph-6");

    mergeBlocks(getPosAfterSelectedBlock());

    expect(editor.document).toMatchSnapshot();
  });

  it("No content & inline content", () => {
    editor.setTextCursorPosition("image-0");

    mergeBlocks(getPosAfterSelectedBlock());

    expect(editor.document).toMatchSnapshot();
  });

  it.skip("Table content & inline content", () => {
    editor.setTextCursorPosition("table-0");

    mergeBlocks(getPosAfterSelectedBlock());

    expect(editor.document).toMatchSnapshot();
  });
});
