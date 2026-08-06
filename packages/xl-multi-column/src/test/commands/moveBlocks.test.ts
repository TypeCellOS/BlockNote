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
