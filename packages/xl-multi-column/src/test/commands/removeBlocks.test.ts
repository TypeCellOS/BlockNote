import { describe, expect, it } from "vitest";

import { setupTestEnv } from "../setupTestEnv.js";

const getEditor = setupTestEnv();

describe("Test removeBlocks", () => {
  it("Remove all blocks in column", () => {
    getEditor().removeBlocks(["column-paragraph-0", "column-paragraph-1"]);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Remove all columns in columnList", () => {
    getEditor().removeBlocks(["column-0", "column-1"]);

    expect(getEditor().document).toMatchSnapshot();
  });
});
