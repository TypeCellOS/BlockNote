import { describe, expect, it } from "vitest";

import { setupTestEnv } from "../setupTestEnv.js";

const getEditor = setupTestEnv();

describe("Test getSelection & setSelection", () => {
  it("Starts in column", () => {
    getEditor().setSelection("column-paragraph-2", "paragraph-2");

    expect(getEditor().getSelection()).toMatchSnapshot();
  });

  it("Ends in column", () => {
    getEditor().setSelection("paragraph-1", "column-paragraph-1");

    expect(getEditor().getSelection()).toMatchSnapshot();
  });

  it("Spans column list", () => {
    getEditor().setSelection("paragraph-1", "paragraph-2");

    expect(getEditor().getSelection()).toMatchSnapshot();
  });
});
