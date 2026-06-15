import { describe, expect, it } from "vite-plus/test";

import { setupTestEnv } from "../setupTestEnv.js";

const getEditor = setupTestEnv();

describe("Test getTextCursorPosition & setTextCursorPosition", () => {
  it("Column list", () => {
    getEditor().setTextCursorPosition("column-list-0");

    expect(getEditor().getTextCursorPosition()).toMatchSnapshot();
  });

  it("Column", () => {
    getEditor().setTextCursorPosition("column-0");

    expect(getEditor().getTextCursorPosition()).toMatchSnapshot();
  });
});
