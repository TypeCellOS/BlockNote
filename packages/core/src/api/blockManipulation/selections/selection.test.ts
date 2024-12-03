import { describe, expect, it } from "vitest";

import { setupTestEnv } from "../setupTestEnv.js";
import { getSelection, setSelection } from "./selection.js";

const getEditor = setupTestEnv();

describe("Test getSelection & setSelection", () => {
  it("Basic", () => {
    setSelection(getEditor(), "paragraph-0", "paragraph-1");

    expect(getSelection(getEditor())).toMatchSnapshot();
  });

  it("Starts in block with children", () => {
    setSelection(getEditor(), "paragraph-with-children", "paragraph-2");

    expect(getSelection(getEditor())).toMatchSnapshot();
  });

  it("Starts in nested block", () => {
    setSelection(getEditor(), "nested-paragraph-0", "paragraph-2");

    expect(getSelection(getEditor())).toMatchSnapshot();
  });

  it("Ends in block with children", () => {
    setSelection(getEditor(), "paragraph-1", "paragraph-with-children");

    expect(getSelection(getEditor())).toMatchSnapshot();
  });

  it("Ends in nested block", () => {
    setSelection(getEditor(), "paragraph-1", "nested-paragraph-0");

    expect(getSelection(getEditor())).toMatchSnapshot();
  });

  it("Contains block with children", () => {
    setSelection(getEditor(), "paragraph-1", "paragraph-2");

    expect(getSelection(getEditor())).toMatchSnapshot();
  });

  it("Starts in table", () => {
    setSelection(getEditor(), "table-0", "paragraph-7");

    expect(getSelection(getEditor())).toMatchSnapshot();
  });

  it("Ends in table", () => {
    setSelection(getEditor(), "paragraph-6", "table-0");

    expect(getSelection(getEditor())).toMatchSnapshot();
  });
});
