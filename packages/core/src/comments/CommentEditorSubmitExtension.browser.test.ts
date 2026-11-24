import type { BlockNoteEditor } from "@blocknote/core";
import { CommentEditorSubmitExtension } from "@blocknote/core/comments";
import { describe, expect, vi } from "vite-plus/test";

type CreateEditor = (
  options: Parameters<typeof CommentEditorSubmitExtension>[0],
  content?: string,
) => Promise<BlockNoteEditor>;

function pressEnter(editor: BlockNoteEditor, options: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", {
    key: "Enter",
    keyCode: 13,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  editor.domElement!.dispatchEvent(event);
  return event;
}

describe("CommentEditorSubmitExtension", () => {
  const it = globalThis.it.extend<{ createEditor: CreateEditor }>({
    createEditor: async ({ setupEditor }, use) => {
      await use(async (options, content = "A comment") => {
        const { editor } = await setupEditor({
          mountType: "dom",
          trailingBlock: false,
          initialContent: [{ type: "paragraph", content }],
          extensions: [CommentEditorSubmitExtension(options)],
        });
        return editor;
      });
    },
  });

  it("passes the editor to the callback provided at initialization", async ({
    createEditor,
  }) => {
    const onSubmit = vi.fn();
    const editor = await createEditor({ onSubmit });
    pressEnter(editor);
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(editor);
  });

  it("shares the pending guard between keyboard and button submission", async ({
    createEditor,
  }) => {
    let finish = () => {};
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const onSubmit = vi.fn(() => pending);
    const editor = await createEditor({ onSubmit });
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

  it("takes precedence over code block Enter behavior", async ({
    createEditor,
  }) => {
    const onSubmit = vi.fn();
    const editor = await createEditor({ onSubmit });
    editor.updateBlock(editor.document[0], { type: "codeBlock" });
    pressEnter(editor);
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(editor.document[0].content).toEqual([
      { type: "text", text: "A comment", styles: {} },
    ]);
  });

  it("submits on Enter by default without inserting a block", async ({
    createEditor,
  }) => {
    const onSubmit = vi.fn();
    const editor = await createEditor({ onSubmit });
    expect(pressEnter(editor).defaultPrevented).toBe(true);
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(editor.document).toHaveLength(1);
  });

  it("allows normal Enter when disabled, but still submits on Mod-Enter", async ({
    createEditor,
  }) => {
    const onSubmit = vi.fn();
    const editor = await createEditor({ onSubmit, submitOnEnter: false });
    pressEnter(editor);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(editor.document).toHaveLength(2);
    pressEnter(editor, { ctrlKey: true });
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("preserves Shift-Enter line breaks", async ({ createEditor }) => {
    const onSubmit = vi.fn();
    const editor = await createEditor({ onSubmit });
    pressEnter(editor, { shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(editor.document).toHaveLength(1);
    expect(
      editor.blocksToFullHTML(editor.document).match(/<br\b/g),
    ).toHaveLength(1);
  });

  it("consumes submission shortcuts on empty comments", async ({
    createEditor,
  }) => {
    const onSubmit = vi.fn();
    const editor = await createEditor({ onSubmit }, "");
    pressEnter(editor);
    pressEnter(editor, { ctrlKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(editor.document).toHaveLength(1);
  });

  it("ignores composition and held keys", async ({ createEditor }) => {
    const onSubmit = vi.fn();
    const editor = await createEditor({ onSubmit });
    pressEnter(editor, { isComposing: true });
    pressEnter(editor, { keyCode: 229 });
    const documentBeforeRepeat = editor.document;
    expect(pressEnter(editor, { repeat: true }).defaultPrevented).toBe(true);
    expect(editor.document).toEqual(documentBeforeRepeat);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit read-only editors", async ({ createEditor }) => {
    const onSubmit = vi.fn();
    const editor = await createEditor({ onSubmit });
    editor.isEditable = false;
    pressEnter(editor);
    expect(onSubmit).not.toHaveBeenCalled();
    editor.isEditable = true;
    pressEnter(editor);
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
