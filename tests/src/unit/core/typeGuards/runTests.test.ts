import { editorHasBlockWithType } from "@blocknote/core";
import { describe, expect } from "vite-plus/test";
import type {} from "../../../../vitestSetup.node-fixtures.js";

import { useFileTestEditor } from "../testEditorOptions.js";

const it = useFileTestEditor();

// Tests for verifying that type guards which check if an editor's schema
// contains a block (and its props) are working correctly.
describe("Editor block schema type guard tests", () => {
  it("blockType", ({ editor }) => {
    expect(editorHasBlockWithType(editor, "heading")).toBeTruthy();
  });

  it("blockTypeInvalid", ({ editor }) => {
    expect(editorHasBlockWithType(editor, "embed")).toBeFalsy();
  });

  it("blockWithPropTypes", ({ editor }) => {
    expect(
      editorHasBlockWithType(editor, "heading", {
        level: "number",
        textColor: "string",
      }),
    ).toBeTruthy();
  });

  it("blockWithPropTypesInvalidType", ({ editor }) => {
    expect(
      editorHasBlockWithType(editor, "heading", {
        level: "number",
        textColor: "number",
      }),
    ).toBeFalsy();
  });

  it("blockWithPropSchema", ({ editor }) => {
    expect(
      editorHasBlockWithType(editor, "heading", {
        level: { default: 1, values: [1, 2, 3] },
        textColor: { default: "default" },
      }),
    ).toBeTruthy();
  });

  it("blockWithPropSchemaInvalidType", ({ editor }) => {
    expect(
      editorHasBlockWithType(editor, "heading", {
        level: { default: 1, values: [1, 2, 3] },
        textColor: { default: 1 },
      }),
    ).toBeFalsy();
  });

  it("blockWithPropSchemaInvalidValues", ({ editor }) => {
    expect(
      editorHasBlockWithType(editor, "heading", {
        level: { default: 1, values: [1, 2, 3, 4, 5, 6, 7] },
        textColor: { default: "default" },
      }),
    ).toBeFalsy();
  });

  it("blockWithPropTypesUndefinedDefault", ({ editor }) => {
    expect(
      editorHasBlockWithType(editor, "numberedListItem", {
        start: "number",
        textColor: "string",
      }),
    ).toBeTruthy();
  });

  it("blockWithPropSchemaUndefinedDefaultInvalidType", ({ editor }) => {
    expect(
      editorHasBlockWithType(editor, "numberedListItem", {
        start: "string",
        textColor: "string",
      }),
    ).toBeFalsy();
  });

  it("customBlockType", ({ editor }) => {
    expect(editorHasBlockWithType(editor, "simpleImage")).toBeTruthy();
  });

  it("customBlockWithPropTypes", ({ editor }) => {
    expect(
      editorHasBlockWithType(editor, "simpleImage", {
        name: "string",
        url: "string",
      }),
    ).toBeTruthy();
  });

  it("customBlockWithPropTypesInvalidType", ({ editor }) => {
    expect(
      editorHasBlockWithType(editor, "simpleImage", {
        name: "string",
        url: "number",
      }),
    ).toBeFalsy();
  });

  it("customBlockWithPropSchema", ({ editor }) => {
    expect(
      editorHasBlockWithType(editor, "simpleImage", {
        name: { default: "" },
        url: { default: "" },
      }),
    ).toBeTruthy();
  });

  it("customBlockWithPropSchemaInvalidType", ({ editor }) => {
    expect(
      editorHasBlockWithType(editor, "simpleImage", {
        name: { default: false },
        url: { default: "" },
      }),
    ).toBeFalsy();
  });

  it("customBlockWithPropSchemaInvalidValues", ({ editor }) => {
    expect(
      editorHasBlockWithType(editor, "simpleImage", {
        name: { default: "", values: ["image", "photo"] },
        url: { default: "" },
      }),
    ).toBeFalsy();
  });
});
