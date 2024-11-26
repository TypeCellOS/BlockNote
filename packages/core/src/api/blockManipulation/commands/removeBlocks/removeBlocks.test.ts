import { describe, expect, it } from "vitest";

import { setupTestEnv } from "../../setupTestEnv.js";
import { removeBlocks } from "./removeBlocks.js";

const getEditor = setupTestEnv();

describe("Test removeBlocks", () => {
  it("Remove single block", () => {
    removeBlocks(getEditor(), ["paragraph-0"]);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Remove multiple consecutive blocks", () => {
    removeBlocks(getEditor(), [
      "paragraph-0",
      "paragraph-1",
      "paragraph-with-children",
    ]);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Remove multiple non-consecutive blocks", () => {
    removeBlocks(getEditor(), [
      "paragraph-0",
      "table-0",
      "heading-with-everything",
    ]);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Remove all child blocks", () => {
    removeBlocks(getEditor(), ["nested-paragraph-0"]);

    expect(getEditor().document).toMatchSnapshot();
  });
});
