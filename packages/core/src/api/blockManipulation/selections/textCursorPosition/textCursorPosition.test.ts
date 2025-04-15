import { describe, expect, it } from "vitest";

import { setupTestEnv } from "../../setupTestEnv.js";
import {
  getTextCursorPosition,
  setTextCursorPosition,
} from "./textCursorPosition.js";

const getEditor = setupTestEnv();

describe("Test getTextCursorPosition & setTextCursorPosition", () => {
  it("Basic", () => {
    getEditor().transact((tr) => {
      setTextCursorPosition(tr, "paragraph-1");
    });

    expect(getTextCursorPosition(getEditor().transaction)).toMatchSnapshot();
  });

  it("First block", () => {
    getEditor().transact((tr) => {
      setTextCursorPosition(tr, "paragraph-0");
    });

    expect(getTextCursorPosition(getEditor().transaction)).toMatchSnapshot();
  });

  it("Last block", () => {
    getEditor().transact((tr) => {
      setTextCursorPosition(tr, "trailing-paragraph");
    });

    expect(getTextCursorPosition(getEditor().transaction)).toMatchSnapshot();
  });

  it("Nested block", () => {
    getEditor().transact((tr) => {
      setTextCursorPosition(tr, "nested-paragraph-0");
    });

    expect(getTextCursorPosition(getEditor().transaction)).toMatchSnapshot();
  });

  it("Set to start", () => {
    getEditor().transact((tr) => {
      setTextCursorPosition(tr, "paragraph-1", "start");
    });

    expect(
      getEditor().prosemirrorState.selection.$from.parentOffset === 0
    ).toBeTruthy();
  });

  it("Set to end", () => {
    getEditor().transact((tr) => {
      setTextCursorPosition(tr, "paragraph-1", "end");
    });

    expect(
      getEditor().prosemirrorState.selection.$from.parentOffset ===
        getEditor().prosemirrorState.selection.$from.node().firstChild!.nodeSize
    ).toBeTruthy();
  });
});
