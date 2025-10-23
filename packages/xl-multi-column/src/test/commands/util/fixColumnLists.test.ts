import { describe, expect, it } from "vitest";

import { setupTestEnv } from "../../setupTestEnv.js";
import {
  fixColumnList,
  isEmptyColumn,
  removeEmptyColumns,
} from "@blocknote/core";

const getEditor = setupTestEnv();

describe("Test isEmptyColumn", () => {
  it("Empty blocks", () => {
    const schema = getEditor()._tiptapEditor.schema;

    const column = schema.nodes["column"].create(undefined, [
      schema.nodes["blockContainer"].create(undefined, [
        schema.nodes["paragraph"].create(),
      ]),
    ]);

    expect(isEmptyColumn(column)).toBeTruthy();
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

    expect(isEmptyColumn(column)).toBeFalsy();
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

    expect(isEmptyColumn(column)).toBeFalsy();
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

    expect(isEmptyColumn(column)).toBeFalsy();
  });

  it("Non-text block", () => {
    const schema = getEditor()._tiptapEditor.schema;

    const column = schema.nodes["column"].create(undefined, [
      schema.nodes["blockContainer"].create(undefined, [
        schema.nodes["image"].create(),
      ]),
    ]);

    expect(isEmptyColumn(column)).toBeFalsy();
  });
});

describe("Test removeEmptyColumns", () => {
  it("Start and end columns empty", () => {
    const editor = getEditor();
    const schema = editor._tiptapEditor.schema;

    const columnList = schema.nodes["columnList"].create(undefined, [
      schema.nodes["column"].create(undefined, [
        schema.nodes["blockContainer"].create(undefined, [
          schema.nodes["paragraph"].create(),
        ]),
      ]),
      schema.nodes["column"].create(undefined, [
        schema.nodes["blockContainer"].create(undefined, [
          schema.nodes["paragraph"].create(undefined, [
            schema.text("Paragraph 1"),
          ]),
        ]),
      ]),
      schema.nodes["column"].create(undefined, [
        schema.nodes["blockContainer"].create(undefined, [
          schema.nodes["paragraph"].create(undefined, [
            schema.text("Paragraph 2"),
          ]),
        ]),
      ]),
      schema.nodes["column"].create(undefined, [
        schema.nodes["blockContainer"].create(undefined, [
          schema.nodes["paragraph"].create(),
        ]),
      ]),
    ]);

    const tr = editor.prosemirrorState.tr;

    tr.replaceRangeWith(1, tr.doc.firstChild!.content.size, columnList);
    removeEmptyColumns(tr, 1);

    expect(tr.doc).toMatchSnapshot();
  });

  it("First of two columns empty", () => {
    const editor = getEditor();
    const schema = editor._tiptapEditor.schema;

    const columnList = schema.nodes["columnList"].create(undefined, [
      schema.nodes["column"].create(undefined, [
        schema.nodes["blockContainer"].create(undefined, [
          schema.nodes["paragraph"].create(),
        ]),
      ]),
      schema.nodes["column"].create(undefined, [
        schema.nodes["blockContainer"].create(undefined, [
          schema.nodes["paragraph"].create(undefined, [
            schema.text("Paragraph 1"),
          ]),
        ]),
      ]),
    ]);

    const tr = editor.prosemirrorState.tr;

    tr.replaceRangeWith(1, tr.doc.firstChild!.content.size, columnList);
    removeEmptyColumns(tr, 1);

    expect(tr.doc).toMatchSnapshot();
  });

  it("Last of two columns empty", () => {
    const editor = getEditor();
    const schema = editor._tiptapEditor.schema;

    const columnList = schema.nodes["columnList"].create(undefined, [
      schema.nodes["column"].create(undefined, [
        schema.nodes["blockContainer"].create(undefined, [
          schema.nodes["paragraph"].create(undefined, [
            schema.text("Paragraph 1"),
          ]),
        ]),
      ]),
      schema.nodes["column"].create(undefined, [
        schema.nodes["blockContainer"].create(undefined, [
          schema.nodes["paragraph"].create(),
        ]),
      ]),
    ]);

    const tr = editor.prosemirrorState.tr;

    tr.replaceRangeWith(1, tr.doc.firstChild!.content.size, columnList);
    removeEmptyColumns(tr, 1);

    expect(tr.doc).toMatchSnapshot();
  });

  it("Two empty columns", () => {
    const editor = getEditor();
    const schema = editor._tiptapEditor.schema;

    const columnList = schema.nodes["columnList"].create(undefined, [
      schema.nodes["column"].create(undefined, [
        schema.nodes["blockContainer"].create(undefined, [
          schema.nodes["paragraph"].create(),
        ]),
      ]),
      schema.nodes["column"].create(undefined, [
        schema.nodes["blockContainer"].create(undefined, [
          schema.nodes["paragraph"].create(),
        ]),
      ]),
    ]);

    const tr = editor.prosemirrorState.tr;

    tr.replaceRangeWith(1, tr.doc.firstChild!.content.size, columnList);
    removeEmptyColumns(tr, 1);

    expect(tr.doc).toMatchSnapshot();
  });
});

describe("Test fixColumnList", () => {
  it("First of two columns empty", () => {
    const editor = getEditor();
    const schema = editor._tiptapEditor.schema;

    const columnList = schema.nodes["columnList"].create(undefined, [
      schema.nodes["column"].create(undefined, [
        schema.nodes["blockContainer"].create(undefined, [
          schema.nodes["paragraph"].create(),
        ]),
      ]),
      schema.nodes["column"].create(undefined, [
        schema.nodes["blockContainer"].create(undefined, [
          schema.nodes["paragraph"].create(undefined, [
            schema.text("Paragraph 1"),
          ]),
        ]),
      ]),
    ]);

    const tr = editor.prosemirrorState.tr;

    tr.replaceRangeWith(1, tr.doc.firstChild!.content.size, columnList);
    fixColumnList(tr, 1);

    expect(tr.doc).toMatchSnapshot();
  });

  it("Last of two columns empty", () => {
    const editor = getEditor();
    const schema = editor._tiptapEditor.schema;

    const columnList = schema.nodes["columnList"].create(undefined, [
      schema.nodes["column"].create(undefined, [
        schema.nodes["blockContainer"].create(undefined, [
          schema.nodes["paragraph"].create(undefined, [
            schema.text("Paragraph 1"),
          ]),
        ]),
      ]),
      schema.nodes["column"].create(undefined, [
        schema.nodes["blockContainer"].create(undefined, [
          schema.nodes["paragraph"].create(),
        ]),
      ]),
    ]);

    const tr = editor.prosemirrorState.tr;

    tr.replaceRangeWith(1, tr.doc.firstChild!.content.size, columnList);
    fixColumnList(tr, 1);

    expect(tr.doc).toMatchSnapshot();
  });

  it("Two empty columns", () => {
    const editor = getEditor();
    const schema = editor._tiptapEditor.schema;

    const columnList = schema.nodes["columnList"].create(undefined, [
      schema.nodes["column"].create(undefined, [
        schema.nodes["blockContainer"].create(undefined, [
          schema.nodes["paragraph"].create(),
        ]),
      ]),
      schema.nodes["column"].create(undefined, [
        schema.nodes["blockContainer"].create(undefined, [
          schema.nodes["paragraph"].create(),
        ]),
      ]),
    ]);

    const tr = editor.prosemirrorState.tr;

    tr.replaceRangeWith(1, tr.doc.firstChild!.content.size, columnList);
    fixColumnList(tr, 1);

    expect(tr.doc).toMatchSnapshot();
  });
});
