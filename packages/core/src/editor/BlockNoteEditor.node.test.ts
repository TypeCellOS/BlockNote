// @vitest-environment node
import { expect, it, vi } from "vite-plus/test";
import { createExtension } from "./BlockNoteExtension.js";
import { BlockNoteEditor } from "./BlockNoteEditor.js";

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
