import { NodeSelection, TextSelection } from "prosemirror-state";
import { CellSelection } from "prosemirror-tables";
import { describe, expect, it } from "vitest";

import { getBlockInfoFromTransaction } from "../../../getBlockInfoFromPos.js";
import { setupTestEnv } from "../../setupTestEnv.js";
import {
  moveBlocksDown,
  moveBlocksUp,
  moveSelectedBlocksAndSelection,
} from "./moveBlocks.js";

const getEditor = setupTestEnv();

function makeSelectionSpanContent(selectionType: "text" | "node" | "cell") {
  const blockInfo = getEditor().transact((tr) =>
    getBlockInfoFromTransaction(tr),
  );
  if (!blockInfo.isBlockContainer) {
    throw new Error(
      `Selection points to a ${blockInfo.blockNoteType} node, not a blockContainer node`,
    );
  }
  const { blockContent } = blockInfo;

  const editor = getEditor();
  if (selectionType === "cell") {
    editor.transact((tr) =>
      tr.setSelection(
        CellSelection.create(
          tr.doc,
          tr.doc.resolve(blockContent.beforePos + 3).before(),
          tr.doc.resolve(blockContent.afterPos - 3).before(),
        ),
      ),
    );
  } else if (selectionType === "node") {
    editor.transact((tr) =>
      tr.setSelection(NodeSelection.create(tr.doc, blockContent.beforePos)),
    );
  } else {
    editor.transact((tr) =>
      tr.setSelection(
        TextSelection.create(
          tr.doc,
          blockContent.beforePos + 1,
          blockContent.afterPos - 1,
        ),
      ),
    );
  }
}

describe("Test moveSelectedBlockAndSelection", () => {
  it("Text selection", () => {
    getEditor().setTextCursorPosition("paragraph-1");
    makeSelectionSpanContent("text");

    moveSelectedBlocksAndSelection(getEditor(), "paragraph-0", "before");

    const selection = getEditor().transact((tr) => tr.selection);
    getEditor().setTextCursorPosition("paragraph-1");
    makeSelectionSpanContent("text");

    expect(
      selection.eq(getEditor().transact((tr) => tr.selection)),
    ).toBeTruthy();
  });

  it("Node selection", () => {
    getEditor().setTextCursorPosition("image-0");
    makeSelectionSpanContent("node");

    moveSelectedBlocksAndSelection(getEditor(), "paragraph-0", "before");

    const selection = getEditor().transact((tr) => tr.selection);
    getEditor().setTextCursorPosition("image-0");
    makeSelectionSpanContent("node");

    expect(
      selection.eq(getEditor().transact((tr) => tr.selection)),
    ).toBeTruthy();
  });

  it("Cell selection", () => {
    getEditor().setTextCursorPosition("table-0");
    makeSelectionSpanContent("cell");

    moveSelectedBlocksAndSelection(getEditor(), "paragraph-0", "before");

    const selection = getEditor().transact((tr) => tr.selection);
    getEditor().setTextCursorPosition("table-0");
    makeSelectionSpanContent("cell");

    expect(
      selection.eq(getEditor().transact((tr) => tr.selection)),
    ).toBeTruthy();
  });

  it("Multiple block selection", () => {
    getEditor().setSelection("paragraph-1", "paragraph-2");

    moveSelectedBlocksAndSelection(getEditor(), "paragraph-0", "before");

    const selection = getEditor().transact((tr) => tr.selection);
    getEditor().setSelection("paragraph-1", "paragraph-2");

    expect(
      selection.eq(getEditor().transact((tr) => tr.selection)),
    ).toBeTruthy();
  });

  it("Multiple block selection with table", () => {
    getEditor().setSelection("paragraph-6", "table-0");

    moveSelectedBlocksAndSelection(getEditor(), "paragraph-0", "before");

    const selection = getEditor().transact((tr) => tr.selection);
    getEditor().setSelection("paragraph-6", "table-0");

    expect(
      selection.eq(getEditor().transact((tr) => tr.selection)),
    ).toBeTruthy();
  });
});

describe("Test moveBlocksUp", () => {
  it("Basic", () => {
    getEditor().setTextCursorPosition("paragraph-1");

    moveBlocksUp(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Into children", () => {
    getEditor().setTextCursorPosition("paragraph-2");

    moveBlocksUp(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Out of children", () => {
    getEditor().setTextCursorPosition("nested-paragraph-1");

    moveBlocksUp(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("First block", () => {
    getEditor().setTextCursorPosition("paragraph-0");

    moveBlocksUp(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Multiple blocks", () => {
    getEditor().setSelection("paragraph-1", "paragraph-2");

    moveBlocksUp(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Multiple blocks starting in block with children", () => {
    getEditor().setSelection("paragraph-with-children", "paragraph-2");

    moveBlocksUp(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Multiple blocks starting in nested block", () => {
    getEditor().setSelection("nested-paragraph-0", "paragraph-2");

    moveBlocksUp(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Multiple blocks ending in block with children", () => {
    getEditor().setSelection("paragraph-1", "paragraph-with-children");

    moveBlocksUp(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Multiple blocks ending in nested block", () => {
    getEditor().setSelection("paragraph-1", "nested-paragraph-0");

    moveBlocksUp(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Multiple blocks starting and ending in nested block", () => {
    getEditor().setSelection("nested-paragraph-0", "nested-paragraph-1");

    moveBlocksUp(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });
});

describe("Test moveBlocksDown", () => {
  it("Basic", () => {
    getEditor().setTextCursorPosition("paragraph-0");

    moveBlocksDown(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Into children", () => {
    getEditor().setTextCursorPosition("paragraph-1");

    moveBlocksDown(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Out of children", () => {
    getEditor().setTextCursorPosition("nested-paragraph-1");

    moveBlocksDown(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Last block", () => {
    getEditor().setTextCursorPosition("trailing-paragraph");

    moveBlocksDown(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Multiple blocks", () => {
    getEditor().setSelection("paragraph-1", "paragraph-2");

    moveBlocksDown(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Multiple blocks starting in block with children", () => {
    getEditor().setSelection("paragraph-with-children", "paragraph-2");

    moveBlocksDown(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Multiple blocks starting in nested block", () => {
    getEditor().setSelection("nested-paragraph-0", "paragraph-2");

    moveBlocksDown(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Multiple blocks ending in block with children", () => {
    getEditor().setSelection("paragraph-1", "paragraph-with-children");

    moveBlocksDown(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Multiple blocks ending in nested block", () => {
    getEditor().setSelection("paragraph-1", "nested-paragraph-0");

    moveBlocksDown(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Multiple blocks starting and ending in nested block", () => {
    getEditor().setSelection("nested-paragraph-0", "nested-paragraph-1");

    moveBlocksDown(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });
});
