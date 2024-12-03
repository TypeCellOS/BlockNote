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
