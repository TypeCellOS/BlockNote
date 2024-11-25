import { describe, expect, it } from "vitest";

import { setupTestEnv } from "../setupTestEnv.js";
import { getSelection, setSelection } from "./selection.js";
import { CellSelection } from "prosemirror-tables";

const getEditor = setupTestEnv();

describe("Test getSelection & setSelection", () => {
  it("Basic", () => {
    setSelection(getEditor(), "paragraph-1");

    expect(getSelection(getEditor())).toMatchSnapshot();
  });

  it("First block", () => {
    setSelection(getEditor(), "paragraph-0");

    expect(getSelection(getEditor())).toMatchSnapshot();
  });

  it("Last block", () => {
    setSelection(getEditor(), "trailing-paragraph");

    expect(getSelection(getEditor())).toMatchSnapshot();
  });

  it("Nested block", () => {
    setSelection(getEditor(), "nested-paragraph-0");

    expect(getSelection(getEditor())).toMatchSnapshot();
  });

  it("Set to start", () => {
    setSelection(getEditor(), {
      block: "paragraph-1",
      selectionType: "collapsedStart",
    });

    const selection = getEditor()._tiptapEditor.state.selection;

    expect(selection.$from.parentOffset === 0).toBeTruthy();
  });

  it("Set to end", () => {
    setSelection(getEditor(), {
      block: "paragraph-1",
      selectionType: "collapsedEnd",
    });

    const selection = getEditor()._tiptapEditor.state.selection;

    expect(
      selection.$from.parentOffset ===
        selection.$from.node().firstChild!.nodeSize
    ).toBeTruthy();
  });

  it("Set span", () => {
    setSelection(getEditor(), {
      block: "paragraph-1",
      selectionType: "span",
    });

    const selection = getEditor()._tiptapEditor.state.selection;

    expect(
      selection.$from.parentOffset === 0 &&
        selection.$to.parentOffset === selection.$to.node().firstChild!.nodeSize
    ).toBeTruthy();
  });

  it("Set to start with no content", () => {
    setSelection(getEditor(), {
      block: "image-0",
      selectionType: "collapsedStart",
    });

    const selection = getEditor()._tiptapEditor.state.selection;

    expect(selection.$from.parentOffset === 0).toBeTruthy();
  });

  it("Set to end with no content", () => {
    setSelection(getEditor(), {
      block: "image-0",
      selectionType: "collapsedEnd",
    });

    const selection = getEditor()._tiptapEditor.state.selection;

    expect(selection.$from.parentOffset === 0).toBeTruthy();
  });

  it("Set span with no content", () => {
    setSelection(getEditor(), {
      block: "image-0",
      selectionType: "span",
    });

    const selection = getEditor()._tiptapEditor.state.selection;

    expect(
      selection.$from.parentOffset === 0 && selection.$to.parentOffset === 1
    ).toBeTruthy();
  });

  it("Set to start with table content", () => {
    setSelection(getEditor(), {
      block: "table-0",
      selectionType: "collapsedStart",
    });

    const selection = getEditor()._tiptapEditor.state.selection;

    expect(selection.$from.parentOffset === 0).toBeTruthy();
  });

  it("Set to end with table content", () => {
    setSelection(getEditor(), {
      block: "table-0",
      selectionType: "collapsedEnd",
    });

    const selection = getEditor()._tiptapEditor.state.selection;

    expect(
      selection.$from.parentOffset ===
        selection.$from.node().firstChild!.nodeSize
    ).toBeTruthy();
  });

  it("Set span with table content", () => {
    setSelection(getEditor(), {
      block: "table-0",
      selectionType: "span",
    });

    const selection = getEditor()._tiptapEditor.state.selection;

    expect(
      selection instanceof CellSelection &&
        selection.isRowSelection() &&
        selection.isColSelection()
    ).toBeTruthy();
  });

  it("Multiple blocks", () => {
    setSelection(getEditor(), {
      startBlock: "paragraph-1",
      endBlock: "paragraph-2",
    });

    expect(getSelection(getEditor())).toMatchSnapshot();
  });

  it("Multiple blocks with nesting", () => {
    setSelection(getEditor(), {
      startBlock: "nested-paragraph-0",
      endBlock: "paragraph-3",
    });

    expect(getSelection(getEditor())).toMatchSnapshot();
  });

  it("Setting multiple blocks includes block without content", () => {
    expect(() =>
      setSelection(getEditor(), {
        startBlock: "paragraph-0",
        endBlock: "image-0",
      })
    ).toThrow();
  });

  it("Setting multiple blocks includes block with table content", () => {
    expect(() =>
      setSelection(getEditor(), {
        startBlock: "paragraph-0",
        endBlock: "table-0",
      })
    ).toThrow();
  });
});
