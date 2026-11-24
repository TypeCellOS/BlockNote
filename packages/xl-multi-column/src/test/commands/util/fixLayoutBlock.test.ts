import { describe, expect } from "vite-plus/test";

import {
  multiColumnTestOptions,
  testEditorSchema,
} from "../../setupTestEnv.js";
import { fixLayoutBlock, isEmptyLayoutChild } from "@blocknote/core";

describe("Test isEmptyLayoutChild", () => {
  it("Empty blocks", async ({ setupEditor }) => {
    const { editor } = await setupEditor({ schema: testEditorSchema });
    const schema = editor.pmSchema;

    const column = schema.nodes["column"].create(undefined, [
      schema.nodes["blockContainer"].create(undefined, [
        schema.nodes["paragraph"].create(),
      ]),
    ]);

    expect(isEmptyLayoutChild(column)).toBeTruthy();
  });

  it("Multiple blocks", async ({ setupEditor }) => {
    const { editor } = await setupEditor({ schema: testEditorSchema });
    const schema = editor.pmSchema;

    const column = schema.nodes["column"].create(undefined, [
      schema.nodes["blockContainer"].create(undefined, [
        schema.nodes["paragraph"].create(undefined),
      ]),
      schema.nodes["blockContainer"].create(undefined, [
        schema.nodes["paragraph"].create(),
      ]),
    ]);

    expect(isEmptyLayoutChild(column)).toBeFalsy();
  });

  it("Block with children", async ({ setupEditor }) => {
    const { editor } = await setupEditor({ schema: testEditorSchema });
    const schema = editor.pmSchema;

    const column = schema.nodes["column"].create(undefined, [
      schema.nodes["blockContainer"].create(undefined, [
        schema.nodes["paragraph"].create(undefined),
        schema.nodes["blockGroup"].create(undefined, [
          schema.nodes["blockContainer"].create(undefined, [
            schema.nodes["paragraph"].create(),
          ]),
        ]),
      ]),
    ]);

    expect(isEmptyLayoutChild(column)).toBeFalsy();
  });

  it("Block with text", async ({ setupEditor }) => {
    const { editor } = await setupEditor({ schema: testEditorSchema });
    const schema = editor.pmSchema;

    const column = schema.nodes["column"].create(undefined, [
      schema.nodes["blockContainer"].create(undefined, [
        schema.nodes["paragraph"].create(undefined, [
          schema.text("Paragraph 1"),
        ]),
      ]),
    ]);

    expect(isEmptyLayoutChild(column)).toBeFalsy();
  });

  it("Non-text block", async ({ setupEditor }) => {
    const { editor } = await setupEditor({ schema: testEditorSchema });
    const schema = editor.pmSchema;

    const column = schema.nodes["column"].create(undefined, [
      schema.nodes["blockContainer"].create(undefined, [
        schema.nodes["image"].create(),
      ]),
    ]);

    expect(isEmptyLayoutChild(column)).toBeFalsy();
  });
});

describe("Test fixLayoutBlock drops emptied columns", () => {
  it.for<[string, string[]]>([
    ["Start and end columns empty", ["", "Paragraph 1", "Paragraph 2", ""]],
    ["First of two columns empty", ["", "Paragraph 1"]],
    ["Last of two columns empty", ["Paragraph 1", ""]],
    ["Two empty columns", ["", ""]],
  ])("%s", async ([_name, texts], { setupEditor }) => {
    const { editor } = await setupEditor(multiColumnTestOptions);
    const schema = editor.pmSchema;
    const columnList = schema.nodes["columnList"].create(
      undefined,
      texts.map((text) =>
        schema.nodes["column"].create(undefined, [
          schema.nodes["blockContainer"].create(undefined, [
            schema.nodes["paragraph"].create(
              undefined,
              text ? schema.text(text) : undefined,
            ),
          ]),
        ]),
      ),
    );
    editor.transact((tr) => {
      tr.replaceRangeWith(1, tr.doc.firstChild!.content.size, columnList);
      fixLayoutBlock(tr, 1);
      expect(tr.doc).toMatchSnapshot();
    });
  });
});
