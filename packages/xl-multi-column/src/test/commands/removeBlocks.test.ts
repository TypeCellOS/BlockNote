import { describe, expect, it } from "vitest";

import { setupTestEnv } from "../setupTestEnv.js";

const getEditor = setupTestEnv();

describe("Test removeBlocks", () => {
  it("Remove all blocks in column", () => {
    getEditor().removeBlocks(["column-paragraph-0", "column-paragraph-1"]);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Remove all blocks in second column", () => {
    getEditor().removeBlocks(["column-paragraph-2", "column-paragraph-3"]);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Remove all blocks in columns", () => {
    getEditor().removeBlocks([
      "column-paragraph-0",
      "column-paragraph-1",
      "column-paragraph-2",
      "column-paragraph-3",
    ]);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Remove column in columnList", () => {
    getEditor().removeBlocks(["column-0"]);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Remove all columns in columnList", () => {
    getEditor().removeBlocks(["column-0", "column-1"]);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Remove all blocks in column and block after", () => {
    getEditor().removeBlocks([
      "column-paragraph-0",
      "column-paragraph-1",
      "paragraph-2",
    ]);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Remove all blocks in columns and block after", () => {
    getEditor().removeBlocks([
      "column-paragraph-0",
      "column-paragraph-1",
      "column-paragraph-2",
      "column-paragraph-3",
      "paragraph-2",
    ]);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Remove column in columnList and block after", () => {
    getEditor().removeBlocks(["column-0", "paragraph-2"]);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Remove all columns in columnList and block after", () => {
    getEditor().removeBlocks(["column-0", "column-1", "paragraph-2"]);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Remove column and and block in column after", () => {
    getEditor().removeBlocks(["column-0", "column-paragraph-2"]);

    expect(getEditor().document).toMatchSnapshot();
  });
});
