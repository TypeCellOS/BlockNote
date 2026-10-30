// @vitest-environment node
import { expect, it, vi } from "vite-plus/test";
import { createExtension } from "./BlockNoteExtension.js";
import { BlockNoteEditor } from "./BlockNoteEditor.js";
import { en } from "../i18n/locales/en.js";

it("reuses complete dictionaries without copying them", () => {
  const dictionary = {
    ...en,
    emoji_picker: { search: "", loading: "Wait", search_no_results: "None" },
  };
  const editor = BlockNoteEditor.create({ dictionary });
  const defaultEditor = BlockNoteEditor.create();
  try {
    expect(editor.dictionary).toBe(dictionary);
    expect(editor.dictionary.emoji_picker).toBe(dictionary.emoji_picker);
    expect(defaultEditor.dictionary).toBe(en);
  } finally {
    editor._tiptapEditor.destroy();
    defaultEditor._tiptapEditor.destroy();
  }
});

it("supplies picker strings for dictionaries that omit the picker section", () => {
  const { emoji_picker: _picker, ...dictionary } = en;
  const editor = BlockNoteEditor.create({
    // @ts-expect-error Simulate a dictionary authored before emoji_picker existed.
    dictionary,
  });
  try {
    expect(editor.dictionary.emoji_picker).toEqual(en.emoji_picker);
    expect(editor.dictionary.slash_menu).toBe(dictionary.slash_menu);
    expect(editor.dictionary).toBe(dictionary);
  } finally {
    editor._tiptapEditor.destroy();
  }
});

it("emits destroy once, including listeners registered during extension initialization", () => {
  const onDestroy = vi.fn();
  const LifecycleExtension = createExtension(({ editor }) => {
    editor.on("destroy", onDestroy);
    return { key: "lifecycle" };
  });
  const editor = BlockNoteEditor.create({ extensions: [LifecycleExtension()] });
  try {
    editor.unmount();
    expect(onDestroy).not.toHaveBeenCalled();
    editor._tiptapEditor.destroy();
    expect(onDestroy).toHaveBeenCalledExactlyOnceWith();
    editor._tiptapEditor.destroy();
    expect(onDestroy).toHaveBeenCalledTimes(1);
  } finally {
    editor._tiptapEditor.destroy();
  }
});

it("can unsubscribe a destroy listener", () => {
  const editor = BlockNoteEditor.create();
  const onDestroy = vi.fn();
  const retainedListener = vi.fn();
  editor.on("destroy", retainedListener);
  const unsubscribe = editor.on("destroy", onDestroy);
  unsubscribe();
  editor._tiptapEditor.destroy();
  expect(onDestroy).not.toHaveBeenCalled();
  expect(retainedListener).toHaveBeenCalledExactlyOnceWith();
});
