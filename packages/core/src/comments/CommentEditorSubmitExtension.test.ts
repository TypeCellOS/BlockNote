/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { CommentEditorSubmitExtension } from "./CommentEditorSubmitExtension.js";

const editors: BlockNoteEditor[] = [];

function createEditor(
  options: Parameters<typeof CommentEditorSubmitExtension>[0],
  content = "A comment",
) {
  const editor = BlockNoteEditor.create({
    trailingBlock: false,
    initialContent: [{ type: "paragraph", content }],
    extensions: [CommentEditorSubmitExtension(options)],
  });
  editor.mount(document.createElement("div"));
  editors.push(editor);
  return editor;
}

function pressEnter(editor: BlockNoteEditor, options: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", {
    key: "Enter",
    keyCode: 13,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  editor.prosemirrorView.dom.dispatchEvent(event);
  return event;
}

afterEach(() => {
  for (const editor of editors) {
    editor.unmount();
  }
  editors.length = 0;
});

describe("CommentEditorSubmitExtension", () => {
  it("passes the editor to the callback provided at initialization", () => {
    const onSubmit = vi.fn();
    const editor = createEditor({ onSubmit });
    pressEnter(editor);
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(editor);
  });

  it("shares the pending guard between keyboard and button submission", async () => {
    let finish = () => {};
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const onSubmit = vi.fn(() => pending);
    const editor = createEditor({ onSubmit });
    const submit = editor.getExtension(CommentEditorSubmitExtension)!.submit;
    pressEnter(editor);
    await submit();
    pressEnter(editor, { ctrlKey: true });
    expect(onSubmit).toHaveBeenCalledOnce();
    finish();
    await pending;
    await submit();
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("takes precedence over code block Enter behavior", () => {
    const onSubmit = vi.fn();
    const editor = createEditor({ onSubmit });
    editor.updateBlock(editor.document[0], { type: "codeBlock" });
    pressEnter(editor);
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(editor.prosemirrorState.doc.textContent).toBe("A comment");
  });

  it("submits on Enter by default without inserting a block", () => {
    const onSubmit = vi.fn();
    const editor = createEditor({ onSubmit });
    expect(pressEnter(editor).defaultPrevented).toBe(true);
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(editor.document).toHaveLength(1);
  });

  it("allows normal Enter when disabled, but still submits on Mod-Enter", () => {
    const onSubmit = vi.fn();
    const editor = createEditor({ onSubmit, submitOnEnter: false });
    pressEnter(editor);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(editor.document).toHaveLength(2);
    pressEnter(editor, { ctrlKey: true });
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("preserves Shift-Enter line breaks", () => {
    const onSubmit = vi.fn();
    const editor = createEditor({ onSubmit });
    pressEnter(editor, { shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(editor.document).toHaveLength(1);
    let lineBreaks = 0;
    editor.prosemirrorState.doc.descendants((node) => {
      if (node.type.name === "hardBreak") {
        lineBreaks++;
      }
    });
    expect(lineBreaks).toBe(1);
  });

  it("consumes submission shortcuts on empty comments", () => {
    const onSubmit = vi.fn();
    const editor = createEditor({ onSubmit }, "");
    pressEnter(editor);
    pressEnter(editor, { ctrlKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(editor.document).toHaveLength(1);
  });

  it("ignores composition and held keys", () => {
    const onSubmit = vi.fn();
    const editor = createEditor({ onSubmit });
    pressEnter(editor, { isComposing: true });
    pressEnter(editor, { keyCode: 229 });
    const documentBeforeRepeat = editor.document;
    expect(pressEnter(editor, { repeat: true }).defaultPrevented).toBe(true);
    expect(editor.document).toEqual(documentBeforeRepeat);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit read-only editors", () => {
    const onSubmit = vi.fn();
    const editor = createEditor({ onSubmit });
    editor.isEditable = false;
    pressEnter(editor);
    expect(onSubmit).not.toHaveBeenCalled();
    editor.isEditable = true;
    pressEnter(editor);
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
