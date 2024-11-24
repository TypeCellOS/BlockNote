import { describe, expect, it } from "vitest";

import { setupTestEnv } from "../setupTestEnv.js";

const getEditor = setupTestEnv();

describe("Test getSelection & setTextCursorPosition", () => {
  it("Column list", () => {
    getEditor().setTextCursorPosition("column-list-0");

    expect(getEditor().getSelection()).toMatchSnapshot();
  });

  it("Column", () => {
    getEditor().setTextCursorPosition("column-0");

    expect(getEditor().getSelection()).toMatchSnapshot();
  });
});
