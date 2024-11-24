import { describe, expect, it } from "vitest";

import { setupTestEnv } from "../setupTestEnv.js";
import { getSelection, setTextCursorPosition } from "./selection.js";

const getEditor = setupTestEnv();

describe("Test getSelection & setTextCursorPosition", () => {
  it("Basic", () => {
    setTextCursorPosition(getEditor(), "paragraph-1");

    expect(getSelection(getEditor())).toMatchSnapshot();
  });

  it("First block", () => {
    setTextCursorPosition(getEditor(), "paragraph-0");

    expect(getSelection(getEditor())).toMatchSnapshot();
  });

  it("Last block", () => {
    setTextCursorPosition(getEditor(), "trailing-paragraph");

    expect(getSelection(getEditor())).toMatchSnapshot();
  });

  it("Nested block", () => {
    setTextCursorPosition(getEditor(), "nested-paragraph-0");

    expect(getSelection(getEditor())).toMatchSnapshot();
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
