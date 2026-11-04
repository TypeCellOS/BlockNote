// @vitest-environment node
import { afterEach, expect, it } from "vite-plus/test";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { LoadingExtension } from "./Loading.js";

const editor = BlockNoteEditor.create();
const loading = editor.getExtension(LoadingExtension)!;

afterEach(() => {
  editor.isEditable = true;
  editor.setReadOnly(false, "preview");
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
  editor.setReadOnly(true, "preview");
  release();
  expect(editor.isEditable).toBe(false);
  editor.isEditable = true;
  expect(editor.isEditable).toBe(false);
  editor.setReadOnly(false, "preview");
  expect(editor.isEditable).toBe(true);
});

it("preserves an initially read-only editor when loading completes", () => {
  const editor = BlockNoteEditor.create({
    _tiptapOptions: { editable: false },
  });
  try {
    const loading = editor.getExtension(LoadingExtension)!;
    const release = loading.acquire();
    expect(loading.store.state.size).toBe(1);
    expect(editor.isEditable).toBe(false);
    release();
    expect(loading.store.state.size).toBe(0);
    expect(editor.isEditable).toBe(false);
    editor.isEditable = true;
    expect(editor.isEditable).toBe(true);
  } finally {
    editor._tiptapEditor.destroy();
  }
});
