/** @vitest-environment jsdom */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { ReadOnlyExtension } from "./ReadOnly.js";

describe("ReadOnlyExtension", () => {
  let editor: BlockNoteEditor;
  let readOnly: ReturnType<ReturnType<typeof ReadOnlyExtension>>;

  beforeEach(() => {
    editor = BlockNoteEditor.create();
    editor.mount(document.createElement("div"));
    readOnly = editor.getExtension(ReadOnlyExtension)!;
  });

  afterEach(() => editor.unmount());

  it("keeps editing disabled until every feature releases its restriction", () => {
    readOnly.setReadOnly(true, "preview");
    readOnly.setReadOnly(true, "upload");
    readOnly.setReadOnly(true, "upload");
    expect(editor.isEditable).toBe(false);

    readOnly.setReadOnly(false, "preview");
    readOnly.setReadOnly(false, "unrelated");
    expect(editor.isEditable).toBe(false);

    readOnly.setReadOnly(false, "upload");
    expect(editor.isEditable).toBe(true);
  });

  it("preserves the application's latest editable setting", () => {
    readOnly.setReadOnly(true, "preview");
    editor.isEditable = true;
    expect(editor.isEditable).toBe(false);

    editor.isEditable = false;
    readOnly.setReadOnly(false, "preview");
    expect(editor.isEditable).toBe(false);

    editor.isEditable = true;
    expect(editor.isEditable).toBe(true);
  });

  it("notifies transaction subscribers without reporting document changes", () => {
    const changes = vi.fn();
    const editableStates: boolean[] = [];
    editor.onChange(changes);
    editor._tiptapEditor.on("transaction", () => {
      editableStates.push(editor.isEditable);
    });

    readOnly.setReadOnly(true, "preview");
    expect(editableStates.length).toBeGreaterThan(0);
    expect(editableStates.every((editable) => !editable)).toBe(true);
    editableStates.length = 0;
    readOnly.setReadOnly(true, "preview");
    expect(editableStates).toEqual([]);
    readOnly.setReadOnly(false, "preview");

    expect(editableStates.length).toBeGreaterThan(0);
    expect(editableStates.every((editable) => editable)).toBe(true);
    expect(changes).not.toHaveBeenCalled();
  });

  it("uses editable metadata for both inputs and skips changes that keep editing locked", () => {
    const metadata: unknown[] = [];
    const changes = vi.fn();
    editor.onChange(changes);
    editor._tiptapEditor.on("transaction", ({ transaction }) => {
      metadata.push(transaction.getMeta("editable"));
    });

    editor.isEditable = false;
    expect(metadata.filter((value) => value !== undefined)).toEqual([true]);
    metadata.length = 0;
    readOnly.setReadOnly(true, "preview");
    editor.isEditable = true;
    readOnly.setReadOnly(true, "upload");
    readOnly.setReadOnly(false, "preview");
    expect(metadata).toEqual([]);
    expect(editor.isEditable).toBe(false);

    readOnly.setReadOnly(false, "upload");
    expect(metadata.filter((value) => value !== undefined)).toEqual([true]);
    expect(editor.isEditable).toBe(true);
    expect(changes).not.toHaveBeenCalled();
  });

  it("applies initial editability and preserves it across remounts", () => {
    editor.unmount();
    editor = BlockNoteEditor.create({ _tiptapOptions: { editable: false } });
    editor.mount(document.createElement("div"));
    expect(editor.isEditable).toBe(false);
    expect(editor.prosemirrorView.editable).toBe(false);

    editor.isEditable = true;
    expect(editor.isEditable).toBe(true);
    editor.isEditable = false;
    editor.unmount();
    editor.mount(document.createElement("div"));
    expect(editor.prosemirrorView.editable).toBe(false);
  });

  it("reports application and feature editability while unmounted", () => {
    editor.unmount();
    editor = BlockNoteEditor.create();
    readOnly = editor.getExtension(ReadOnlyExtension)!;

    expect(editor.isEditable).toBe(true);

    editor.isEditable = false;
    expect(editor.isEditable).toBe(false);

    editor.isEditable = true;
    expect(editor.isEditable).toBe(true);

    readOnly.setReadOnly(true, "preview");
    expect(editor.isEditable).toBe(false);

    editor.isEditable = false;
    readOnly.setReadOnly(false, "preview");
    expect(editor.isEditable).toBe(false);

    editor.isEditable = true;
    expect(editor.isEditable).toBe(true);
  });

  it("honours editability set before mount", () => {
    editor.unmount();
    editor = BlockNoteEditor.create();
    editor.isEditable = false;
    expect(editor.isEditable).toBe(false);
    editor.mount(document.createElement("div"));
    expect(editor.isEditable).toBe(false);
    expect(editor.prosemirrorView.editable).toBe(false);
  });

  it("groups application editability changes into the pending transaction", () => {
    const transactions = vi.fn();
    const changes = vi.fn();
    editor._tiptapEditor.on("transaction", transactions);
    editor.onChange(changes);

    editor.transact(() => {
      editor.isEditable = false;
    });
    expect(editor.isEditable).toBe(false);
    expect(transactions).toHaveBeenCalled();
    expect(changes).not.toHaveBeenCalled();

    transactions.mockClear();
    editor.transact((tr) => {
      tr.insertText("hello", 1);
      editor.isEditable = true;
    });
    expect(editor.isEditable).toBe(true);
    expect(editor.prosemirrorState.doc.textContent).toContain("hello");
    expect(transactions).toHaveBeenCalled();
    expect(changes).toHaveBeenCalledTimes(1);
  });

  it("composes with pending document and metadata-only transactions", () => {
    editor.transact((tr) => {
      tr.insertText("hello", 1);
      readOnly.setReadOnly(true, "preview");
    });
    expect(editor.prosemirrorState.doc.textContent).toContain("hello");
    expect(editor.isEditable).toBe(false);

    editor.transact(() => readOnly.setReadOnly(false, "preview"));
    expect(editor.isEditable).toBe(true);
  });
});
