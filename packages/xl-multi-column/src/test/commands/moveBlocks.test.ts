import { describe, expect, it } from "vitest";

import { setupTestEnv } from "../setupTestEnv.js";

const getEditor = setupTestEnv();

describe("Test moveBlocksUp", () => {
  it("Move into column list", () => {
    getEditor().setTextCursorPosition("paragraph-2");

    getEditor().moveBlocksUp();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Move out of column list", () => {
    getEditor().setTextCursorPosition("column-paragraph-0");

    getEditor().moveBlocksUp();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Move into previous column", () => {
    getEditor().setTextCursorPosition("column-paragraph-2");

    getEditor().moveBlocksUp();

    expect(getEditor().document).toMatchSnapshot();
  });
});

describe("Test moveBlocksDown", () => {
  it("Move into column list", () => {
    getEditor().setTextCursorPosition("paragraph-1");

    getEditor().moveBlocksDown();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Move out of column list", () => {
    getEditor().setTextCursorPosition("column-paragraph-3");

    getEditor().moveBlocksDown();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Move into next column", () => {
    getEditor().setTextCursorPosition("column-paragraph-1");

    getEditor().moveBlocksDown();

    expect(getEditor().document).toMatchSnapshot();
  });
});

// Regression tests for https://github.com/TypeCellOS/BlockNote/issues/2594:
// when a column contains only a single block, moving that block out of the
// column triggers `fixColumnList` to collapse the columnList, which used to
// invalidate the destination `referenceBlock`.
describe("Test moveBlocks with single-block columns", () => {
  it("Move out of a single-block column does not throw", () => {
    const editor = getEditor();
    editor.replaceBlocks(editor.document, [
      {
        id: "column-list-single",
        type: "columnList",
        children: [
          {
            id: "column-a",
            type: "column",
            children: [
              {
                id: "only-paragraph-a",
                type: "paragraph",
                content: "A",
              },
            ],
          },
          {
            id: "column-b",
            type: "column",
            children: [
              {
                id: "only-paragraph-b",
                type: "paragraph",
                content: "B",
              },
            ],
          },
        ],
      },
      { id: "below", type: "paragraph", content: "below" },
    ]);
    editor.setTextCursorPosition("only-paragraph-a");

    expect(() => editor.moveBlocksUp()).not.toThrow();
  });

  it("Move out of a single-block column when columnList is preceded by a sibling", () => {
    const editor = getEditor();
    editor.replaceBlocks(editor.document, [
      { id: "above", type: "paragraph", content: "above" },
      {
        id: "column-list-single-2",
        type: "columnList",
        children: [
          {
            id: "column-c",
            type: "column",
            children: [
              {
                id: "only-paragraph-c",
                type: "paragraph",
                content: "C",
              },
            ],
          },
          {
            id: "column-d",
            type: "column",
            children: [
              {
                id: "only-paragraph-d",
                type: "paragraph",
                content: "D",
              },
            ],
          },
        ],
      },
    ]);
    editor.setTextCursorPosition("only-paragraph-c");

    expect(() => editor.moveBlocksUp()).not.toThrow();
  });
});
