import { describe, expect, it } from "vite-plus/test";

import { setupTestEnv } from "../../setupTestEnv.js";
import { fixContainer, isEmptyContainerChild } from "@blocknote/core";

const getEditor = setupTestEnv();

describe("Test isEmptyContainerChild", () => {
  it("Empty blocks", () => {
    const schema = getEditor()._tiptapEditor.schema;

    const column = schema.nodes["column"].create(undefined, [
      schema.nodes["blockContainer"].create(undefined, [
        schema.nodes["paragraph"].create(),
      ]),
    ]);

    expect(isEmptyContainerChild(column)).toBeTruthy();
  });

  it("Multiple blocks", () => {
    const schema = getEditor()._tiptapEditor.schema;

    const column = schema.nodes["column"].create(undefined, [
      schema.nodes["blockContainer"].create(undefined, [
        schema.nodes["paragraph"].create(undefined),
      ]),
      schema.nodes["blockContainer"].create(undefined, [
        schema.nodes["paragraph"].create(),
      ]),
    ]);

    expect(isEmptyContainerChild(column)).toBeFalsy();
  });

  it("Block with children", () => {
    const schema = getEditor()._tiptapEditor.schema;

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

    expect(isEmptyContainerChild(column)).toBeFalsy();
  });

  it("Block with text", () => {
    const schema = getEditor()._tiptapEditor.schema;

    const column = schema.nodes["column"].create(undefined, [
      schema.nodes["blockContainer"].create(undefined, [
        schema.nodes["paragraph"].create(undefined, [
          schema.text("Paragraph 1"),
        ]),
      ]),
    ]);

    expect(isEmptyContainerChild(column)).toBeFalsy();
  });

  it("Non-text block", () => {
    const schema = getEditor()._tiptapEditor.schema;

    const column = schema.nodes["column"].create(undefined, [
      schema.nodes["blockContainer"].create(undefined, [
        schema.nodes["image"].create(),
      ]),
    ]);

    expect(isEmptyContainerChild(column)).toBeFalsy();
  });
});

describe("Test fixContainer drops emptied columns", () => {
  it.each<[string, string[]]>([
    ["Start and end columns empty", ["", "Paragraph 1", "Paragraph 2", ""]],
    ["First of two columns empty", ["", "Paragraph 1"]],
    ["Last of two columns empty", ["Paragraph 1", ""]],
    ["Two empty columns", ["", ""]],
  ])("%s", (_name, texts) => {
    const editor = getEditor();
    const schema = editor._tiptapEditor.schema;
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
    const tr = editor.prosemirrorState.tr;
    tr.replaceRangeWith(1, tr.doc.firstChild!.content.size, columnList);
    fixContainer(tr, 1);
    expect(tr.doc).toMatchSnapshot();
  });
});
