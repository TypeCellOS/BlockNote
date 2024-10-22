import { describe, expect, it } from "vitest";

import { setupTestEnv } from "../../setupTestEnv.js";
import {
  getTextCursorPosition,
  setTextCursorPosition,
} from "./textCursorPosition.js";

const getEditor = setupTestEnv();

describe("Test getTextCursorPosition & setTextCursorPosition", () => {
  it("Basic", () => {
    setTextCursorPosition(getEditor(), "paragraph-1");

    expect(getTextCursorPosition(getEditor())).toMatchSnapshot();
  });

  it("First block", () => {
    setTextCursorPosition(getEditor(), "paragraph-0");

    expect(getTextCursorPosition(getEditor())).toMatchSnapshot();
  });

  it("Last block", () => {
    setTextCursorPosition(getEditor(), "trailing-paragraph");

    expect(getTextCursorPosition(getEditor())).toMatchSnapshot();
  });

  it("Nested block", () => {
    setTextCursorPosition(getEditor(), "nested-paragraph-0");

    expect(getTextCursorPosition(getEditor())).toMatchSnapshot();
  });

  it("Set to start", () => {
    setTextCursorPosition(getEditor(), "paragraph-1", "start");

    expect(
      getEditor()._tiptapEditor.state.selection.$from.parentOffset === 0
    ).toBeTruthy();
  });

  it("Set to end", () => {
    setTextCursorPosition(getEditor(), "paragraph-1", "end");

    expect(
      getEditor()._tiptapEditor.state.selection.$from.parentOffset ===
        getEditor()._tiptapEditor.state.selection.$from.node().firstChild!
          .nodeSize
    ).toBeTruthy();
  });
});
