import { BlockNoteEditor, editorHasBlockWithType } from "@blocknote/core";
import { describe, expect, it } from "vitest";

import { createTestEditor } from "../createTestEditor.js";
import { testSchema } from "../testSchema.js";

// Tests for verifying that type guards which check if an editor's schema
// contains a block (and its props) are working correctly.
describe("Editor block schema type guard tests", () => {
  const getEditor = createTestEditor(testSchema) as () => BlockNoteEditor<
    any,
    any,
    any
  >;

  it("blockType", () => {
    expect(editorHasBlockWithType(getEditor(), "heading")).toBeTruthy();
  });

  it("blockTypeInvalid", () => {
    expect(editorHasBlockWithType(getEditor(), "embed")).toBeFalsy();
  });

  it("blockWithPropTypes", () => {
    expect(
      editorHasBlockWithType(getEditor(), "heading", {
        level: "number",
        textColor: "string",
      }),
    ).toBeTruthy();
  });

  it("blockWithPropTypesInvalidType", () => {
    expect(
      editorHasBlockWithType(getEditor(), "heading", {
        level: "number",
        textColor: "number",
      }),
    ).toBeFalsy();
  });

  it("blockWithPropSchema", () => {
    expect(
      editorHasBlockWithType(getEditor(), "heading", {
        level: { default: 1, values: [1, 2, 3] },
        textColor: { default: "default" },
      }),
    ).toBeTruthy();
  });

  it("blockWithPropSchemaInvalidType", () => {
    expect(
      editorHasBlockWithType(getEditor(), "heading", {
        level: { default: 1, values: [1, 2, 3] },
        textColor: { default: 1 },
      }),
    ).toBeFalsy();
  });

  it("blockWithPropSchemaInvalidValues", () => {
    expect(
      editorHasBlockWithType(getEditor(), "heading", {
        level: { default: 1, values: [1, 2, 3, 4, 5, 6, 7] },
        textColor: { default: "default" },
      }),
    ).toBeFalsy();
  });

  it("blockWithPropTypesUndefinedDefault", () => {
    expect(
      editorHasBlockWithType(getEditor(), "numberedListItem", {
        start: "number",
        textColor: "string",
      }),
    ).toBeTruthy();
  });

  it("blockWithPropSchemaUndefinedDefaultInvalidType", () => {
    expect(
      editorHasBlockWithType(getEditor(), "numberedListItem", {
        start: "string",
        textColor: "string",
      }),
    ).toBeFalsy();
  });
});
