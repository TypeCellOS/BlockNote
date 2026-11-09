// @vitest-environment node
import { afterEach, expect, it } from "vite-plus/test";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { ReadOnlyExtension } from "../ReadOnly/ReadOnly.js";
import { LoadingExtension } from "./Loading.js";

const editor = BlockNoteEditor.create();
const loading = editor.getExtension(LoadingExtension)!;
const readOnly = editor.getExtension(ReadOnlyExtension)!;

afterEach(() => {
  editor.isEditable = true;
  readOnly.setReadOnly(false, "preview");
});

it("blocks editing until every loading token is released", () => {
  const release = loading.acquire();
  const releaseOther = loading.acquire();
  try {
    expect(editor.isEditable).toBe(false);
    release();
    release();
    expect(editor.isEditable).toBe(false);
    releaseOther();
    expect(editor.isEditable).toBe(true);
  } finally {
    release();
    releaseOther();
  }
});

it("preserves application and independent feature restrictions", () => {
  const release = loading.acquire();
  editor.isEditable = false;
  readOnly.setReadOnly(true, "preview");
  release();
  expect(editor.isEditable).toBe(false);
  editor.isEditable = true;
  expect(editor.isEditable).toBe(false);
  readOnly.setReadOnly(false, "preview");
  expect(editor.isEditable).toBe(true);
});

it("tracks tokens without a ReadOnly extension", () => {
  const editor = BlockNoteEditor.create({ disableExtensions: ["readOnly"] });
  try {
    const loading = editor.getExtension(LoadingExtension)!;
    expect(editor.getExtension(ReadOnlyExtension)).toBeUndefined();
    const release = loading.acquire();
    expect(loading.store.state.size).toBe(1);
    release();
    expect(loading.store.state.size).toBe(0);
  } finally {
    editor._tiptapEditor.destroy();
  }
});
