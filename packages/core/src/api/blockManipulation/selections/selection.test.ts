import { describe, expect, it } from "vitest";

import { setupTestEnv } from "../setupTestEnv.js";
import { getSelection, setSelection } from "./selection.js";

const getEditor = setupTestEnv();

describe("Test getSelection & setSelection", () => {
  it("Basic", () => {
    getEditor().transact((tr) => {
      setSelection(tr, "paragraph-0", "paragraph-1");
    });

    expect(getSelection(getEditor().transaction)).toMatchSnapshot();
  });

  it("Starts in block with children", () => {
    getEditor().transact((tr) => {
      setSelection(tr, "paragraph-with-children", "paragraph-2");
    });

    expect(getSelection(getEditor().transaction)).toMatchSnapshot();
  });

  it("Starts in nested block", () => {
    getEditor().transact((tr) => {
      setSelection(tr, "nested-paragraph-0", "paragraph-2");
    });

    expect(getSelection(getEditor().transaction)).toMatchSnapshot();
  });

  it("Ends in block with children", () => {
    getEditor().transact((tr) => {
      setSelection(tr, "paragraph-1", "paragraph-with-children");
    });

    expect(getSelection(getEditor().transaction)).toMatchSnapshot();
  });

  it("Ends in nested block", () => {
    getEditor().transact((tr) => {
      setSelection(tr, "paragraph-1", "nested-paragraph-0");
    });

    expect(getSelection(getEditor().transaction)).toMatchSnapshot();
  });

  it("Contains block with children", () => {
    getEditor().transact((tr) => {
      setSelection(tr, "paragraph-1", "paragraph-2");
    });

    expect(getSelection(getEditor().transaction)).toMatchSnapshot();
  });

  it("Starts in table", () => {
    getEditor().transact((tr) => {
      setSelection(tr, "table-0", "paragraph-7");
    });

    expect(getSelection(getEditor().transaction)).toMatchSnapshot();
  });

  it("Ends in table", () => {
    getEditor().transact((tr) => {
      setSelection(tr, "paragraph-6", "table-0");
    });

    expect(getSelection(getEditor().transaction)).toMatchSnapshot();
  });
});
