import { BlockNoteEditor, editorHasBlockWithType } from "@blocknote/core";
import { describe, expect, it } from "vitest";
import * as z from "zod/v4";
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
      editorHasBlockWithType(
        getEditor(),
        "heading",
        z.object({
          level: z.number(),
          textColor: z.string(),
        }),
      ),
    ).toBeTruthy();
  });

  it("blockWithPropTypesInvalidType", () => {
    expect(
      editorHasBlockWithType(
        getEditor(),
        "heading",
        z.object({
          level: z.number(),
          textColor: z.number(),
        }),
      ),
    ).toBeFalsy();
  });

  it("blockWithPropSchema", () => {
    expect(
      editorHasBlockWithType(
        getEditor(),
        "heading",
        z.object({
          level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
          textColor: z.string().default("default"),
        }),
      ),
    ).toBeTruthy();
  });

  it("blockWithPropSchemaInvalidType", () => {
    expect(
      editorHasBlockWithType(
        getEditor(),
        "heading",
        z.object({
          level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
          textColor: z.number().default(1),
        }),
      ),
    ).toBeFalsy();
  });

  it("blockWithPropSchemaInvalidValues", () => {
    expect(
      editorHasBlockWithType(
        getEditor(),
        "heading",
        z.object({
          level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
          textColor: z.string().default("default"),
        }),
      ),
    ).toBeFalsy();
  });

  it("blockWithPropTypesUndefinedDefault", () => {
    expect(
      editorHasBlockWithType(
        getEditor(),
        "numberedListItem",
        z.object({
          start: z.number(),
          textColor: z.string(),
        }),
      ),
    ).toBeTruthy();
  });

  it("blockWithPropSchemaUndefinedDefaultInvalidType", () => {
    expect(
      editorHasBlockWithType(
        getEditor(),
        "numberedListItem",
        z.object({
          start: z.string(),
          textColor: z.string(),
        }),
      ),
    ).toBeFalsy();
  });

  it("customBlockType", () => {
    expect(editorHasBlockWithType(getEditor(), "simpleImage")).toBeTruthy();
  });

  it("customBlockWithPropTypes", () => {
    expect(
      editorHasBlockWithType(
        getEditor(),
        "simpleImage",
        z.object({
          name: z.string(),
          url: z.string(),
        }),
      ),
    ).toBeTruthy();
  });

  it("customBlockWithPropTypesInvalidType", () => {
    expect(
      editorHasBlockWithType(
        getEditor(),
        "simpleImage",
        z.object({
          name: z.string(),
          url: z.number(),
        }),
      ),
    ).toBeFalsy();
  });

  it("customBlockWithPropSchema", () => {
    expect(
      editorHasBlockWithType(
        getEditor(),
        "simpleImage",
        z.object({
          name: z.string().default(""),
          url: z.string().default(""),
        }),
      ),
    ).toBeTruthy();
  });

  it("customBlockWithPropSchemaInvalidType", () => {
    expect(
      editorHasBlockWithType(
        getEditor(),
        "simpleImage",
        z.object({
          name: z.boolean().default(false),
          url: z.string().default(""),
        }),
      ),
    ).toBeFalsy();
  });

  it("customBlockWithPropSchemaInvalidValues", () => {
    expect(
      editorHasBlockWithType(
        getEditor(),
        "simpleImage",
        z.object({
          name: z
            .union([z.literal("image"), z.literal("photo")])
            .default("photo"),
          url: z.string().default(""),
        }),
      ),
    ).toBeFalsy();
  });
});
