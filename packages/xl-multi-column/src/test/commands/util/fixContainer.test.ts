import { describe, expect, it } from "vite-plus/test";

import { setupTestEnv } from "../../setupTestEnv.js";
import {
  fixContainer,
  isEmptyContainerChild,
  removeEmptyChildren,
} from "@blocknote/core";

const getEditor = setupTestEnv();

describe("Test isEmptyContainerChild, on a column", () => {
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

describe("Test removeEmptyChildren, on a column list", () => {
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
    removeEmptyChildren(tr, 1);

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
    removeEmptyChildren(tr, 1);

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
    removeEmptyChildren(tr, 1);

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
    removeEmptyChildren(tr, 1);

    expect(tr.doc).toMatchSnapshot();
  });
});

describe("Test fixContainer, on a column list", () => {
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
    fixContainer(tr, 1);

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
    fixContainer(tr, 1);

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
    fixContainer(tr, 1);

    expect(tr.doc).toMatchSnapshot();
  });
});
