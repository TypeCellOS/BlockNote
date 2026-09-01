import { beforeEach, describe, expect, it } from "vite-plus/test";

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

  it("Selection spans column list", () => {
    getEditor().setSelection("paragraph-1", "paragraph-2");

    getEditor().moveBlocksUp();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Selection across columns", () => {
    getEditor().setSelection("column-paragraph-1", "column-paragraph-2");

    getEditor().moveBlocksUp();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Selection starts outside, ends in column", () => {
    getEditor().setSelection("paragraph-1", "column-paragraph-1");

    getEditor().moveBlocksUp();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Selection starts outside, ends in second column", () => {
    getEditor().setSelection("paragraph-1", "column-paragraph-2");

    getEditor().moveBlocksUp();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Selection starts in column, ends outside", () => {
    getEditor().setSelection("column-paragraph-2", "paragraph-2");

    getEditor().moveBlocksUp();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Selection starts in first column, ends outside", () => {
    getEditor().setSelection("column-paragraph-1", "paragraph-2");

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

  it("Selection spans column list", () => {
    getEditor().setSelection("paragraph-1", "paragraph-2");

    getEditor().moveBlocksDown();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Selection across columns", () => {
    getEditor().setSelection("column-paragraph-1", "column-paragraph-2");

    getEditor().moveBlocksDown();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Selection starts outside, ends in column", () => {
    getEditor().setSelection("paragraph-1", "column-paragraph-1");

    getEditor().moveBlocksDown();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Selection starts outside, ends in second column", () => {
    getEditor().setSelection("paragraph-1", "column-paragraph-2");

    getEditor().moveBlocksDown();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Selection starts in column, ends outside", () => {
    getEditor().setSelection("column-paragraph-2", "paragraph-2");

    getEditor().moveBlocksDown();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Selection starts in first column, ends outside", () => {
    getEditor().setSelection("column-paragraph-1", "paragraph-2");

    getEditor().moveBlocksDown();

    expect(getEditor().document).toMatchSnapshot();
  });
});

describe("Move past empty sibling within a column", () => {
  beforeEach(() => {
    getEditor().replaceBlocks(getEditor().document, [
      {
        id: "column-list-empty",
        type: "columnList",
        children: [
          {
            id: "column-empty-0",
            type: "column",
            children: [
              { id: "empty-0", type: "paragraph" },
              { id: "text-0", type: "paragraph", content: "Text 0" },
            ],
          },
          {
            id: "column-empty-1",
            type: "column",
            children: [
              { id: "empty-1", type: "paragraph" },
              { id: "text-1", type: "paragraph", content: "Text 1" },
            ],
          },
        ],
      },
    ]);
  });

  it("Move up above empty sibling", () => {
    getEditor().setTextCursorPosition("text-0");

    expect(() => getEditor().moveBlocksUp()).not.toThrow();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Move down below empty sibling", () => {
    getEditor().setTextCursorPosition("empty-0");

    expect(() => getEditor().moveBlocksDown()).not.toThrow();

    expect(getEditor().document).toMatchSnapshot();
  });
});

// A `column` is `placement: "containerOnly"`, so it can't be moved anywhere a
// regular block goes: moving one dissolves it and moves its children instead.
// The column list is left at its `min` of 2 by an empty replacement column,
// rather than unwrapping - see the note on emptied columns below.
describe("Move a column", () => {
  it("Move column up", () => {
    getEditor().moveBlocksUp("column-1");

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Move column down", () => {
    getEditor().moveBlocksDown("column-0");

    expect(getEditor().document).toMatchSnapshot();
  });
});

// A move is a rearrangement rather than a deletion, so a column it empties out
// is deliberately left standing instead of being collapsed (see `moveBlocks`).
describe("Empty a column by moving out of it", () => {
  beforeEach(() => {
    getEditor().replaceBlocks(getEditor().document, [
      { id: "paragraph-before", type: "paragraph", content: "Before" },
      {
        id: "column-list-single",
        type: "columnList",
        children: [
          {
            id: "column-single-0",
            type: "column",
            children: [{ id: "only-0", type: "paragraph", content: "Only 0" }],
          },
          {
            id: "column-single-1",
            type: "column",
            children: [{ id: "only-1", type: "paragraph", content: "Only 1" }],
          },
        ],
      },
      { id: "paragraph-after", type: "paragraph", content: "After" },
    ]);
  });

  it("Move the only block out of the first column", () => {
    getEditor().setTextCursorPosition("only-0");

    getEditor().moveBlocksUp();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Move the only block out of the last column", () => {
    getEditor().setTextCursorPosition("only-1");

    getEditor().moveBlocksDown();

    expect(getEditor().document).toMatchSnapshot();
  });
});
