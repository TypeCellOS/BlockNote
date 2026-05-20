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
