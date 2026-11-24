import { describe, expect } from "vite-plus/test";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  installHeadlessPlugins,
  pressHeadlessKey,
  typeText as typeString,
} from "../../extensions/testHeadlessEditor.js";

function pressKey(
  editor: BlockNoteEditor,
  key: string,
  modifiers: Omit<KeyboardEventInit, "key"> = {},
) {
  pressHeadlessKey(editor, { key, ...modifiers });
}

describe("Code block input rule", () => {
  const it = globalThis.it.extend<{ editor: BlockNoteEditor }>({
    editor: async ({ setupEditor }, use) => {
      const { editor } = await setupEditor({
        initialContent: [
          { id: "test-paragraph", type: "paragraph", content: "" },
        ],
      });
      installHeadlessPlugins(editor);
      editor.setTextCursorPosition("test-paragraph", "start");
      await use(editor);
    },
  });

  it("converts ```ts + space into a codeBlock", ({ editor }) => {
    typeString(editor, "```ts ");

    const block = editor.document[0];
    expect(block.type).toBe("codeBlock");
    // Without supportedLanguages configured, the raw alias is used
    expect((block.props as any).language).toBe("ts");
  });

  it("converts ``` + space into a codeBlock with the default language", ({
    editor,
  }) => {
    typeString(editor, "``` ");

    const block = editor.document[0];
    expect(block.type).toBe("codeBlock");
    expect((block.props as any).language).toBe("text");
  });

  it("converts ```javascript + space into a codeBlock", ({ editor }) => {
    typeString(editor, "```javascript ");

    const block = editor.document[0];
    expect(block.type).toBe("codeBlock");
    expect((block.props as any).language).toBe("javascript");
  });

  it("does not trigger input rule without trailing space", ({ editor }) => {
    typeString(editor, "```ts");

    const block = editor.document[0];
    expect(block.type).toBe("paragraph");
  });

  it("does not trigger with only two backticks", ({ editor }) => {
    typeString(editor, "``ts ");

    const block = editor.document[0];
    expect(block.type).toBe("paragraph");
  });

  it("does not trigger in non-empty paragraph with preceding text", ({
    editor,
  }) => {
    typeString(editor, "some text ```ts ");

    const block = editor.document[0];
    // The ^ anchor in the regex means it only triggers at the start of a block
    expect(block.type).toBe("paragraph");
  });

  it("code block content is empty after conversion", ({ editor }) => {
    typeString(editor, "```ts ");

    const block = editor.document[0];
    expect(block.type).toBe("codeBlock");
    expect(block.content).toEqual([]);
  });

  it("converts ```ts + Enter into a codeBlock", ({ editor }) => {
    typeString(editor, "```ts");
    pressKey(editor, "Enter");

    const block = editor.document[0];
    expect(block.type).toBe("codeBlock");
    expect((block.props as any).language).toBe("ts");
    expect(block.content).toEqual([]);
  });

  it("converts ``` + Enter into a codeBlock with the default language", ({
    editor,
  }) => {
    typeString(editor, "```");
    pressKey(editor, "Enter");

    const block = editor.document[0];
    expect(block.type).toBe("codeBlock");
    expect((block.props as any).language).toBe("text");
  });

  it("converts ```javascript + Enter into a codeBlock", ({ editor }) => {
    typeString(editor, "```javascript");
    pressKey(editor, "Enter");

    const block = editor.document[0];
    expect(block.type).toBe("codeBlock");
    expect((block.props as any).language).toBe("javascript");
  });

  it("does not trigger Enter conversion in non-empty paragraph with preceding text", ({
    editor,
  }) => {
    typeString(editor, "some text ```ts");
    pressKey(editor, "Enter");

    const block = editor.document[0];
    expect(block.type).toBe("paragraph");
  });

  it("does not trigger Enter conversion with only two backticks", ({
    editor,
  }) => {
    typeString(editor, "``ts");
    pressKey(editor, "Enter");

    const block = editor.document[0];
    expect(block.type).toBe("paragraph");
  });

  it("places cursor inside the new code block after space conversion", ({
    editor,
  }) => {
    typeString(editor, "```ts ");

    const block = editor.document[0];
    expect(block.type).toBe("codeBlock");

    const { block: cursorBlock } = editor.getTextCursorPosition();
    expect(cursorBlock.id).toBe(block.id);

    // Typing should now go into the code block, not after it.
    typeString(editor, "hello");
    const after = editor.document[0];
    expect(after.type).toBe("codeBlock");
    expect(after.id).toBe(block.id);
    expect(after.content).toEqual([
      { type: "text", text: "hello", styles: {} },
    ]);
  });

  it("places cursor inside the new code block after Enter conversion", ({
    editor,
  }) => {
    typeString(editor, "```ts");
    pressKey(editor, "Enter");

    const block = editor.document[0];
    expect(block.type).toBe("codeBlock");

    const { block: cursorBlock } = editor.getTextCursorPosition();
    expect(cursorBlock.id).toBe(block.id);

    typeString(editor, "world");
    const after = editor.document[0];
    expect(after.type).toBe("codeBlock");
    expect(after.id).toBe(block.id);
    expect(after.content).toEqual([
      { type: "text", text: "world", styles: {} },
    ]);
  });

  it("Enter inside an existing code block does not retrigger conversion", ({
    editor,
  }) => {
    typeString(editor, "```ts ");

    const block = editor.document[0];
    expect(block.type).toBe("codeBlock");

    typeString(editor, "```js");
    pressKey(editor, "Enter");

    // Enter inside a code block should insert a newline, not convert again.
    const after = editor.document[0];
    expect(after.type).toBe("codeBlock");
    expect((after.props as any).language).toBe("ts");
  });
});

describe("Code block keyboard shortcut", () => {
  const onMac = /Mac/.test(globalThis.navigator?.platform ?? "");

  const it = globalThis.it.extend<{ editor: BlockNoteEditor }>({
    editor: async ({ setupEditor }, use) => {
      const { editor } = await setupEditor({
        initialContent: [
          {
            id: "test-paragraph",
            type: "paragraph",
            content: [
              { type: "text", text: "const ", styles: {} },
              { type: "text", text: "x", styles: { bold: true } },
            ],
          },
          { id: "test-image", type: "image" },
        ],
      });
      installHeadlessPlugins(editor);
      await use(editor);
    },
  });

  it("converts the current block into a codeBlock on Mod-Alt-c", ({
    editor,
  }) => {
    editor.setTextCursorPosition("test-paragraph", "end");
    pressKey(editor, "c", { ctrlKey: !onMac, metaKey: onMac, altKey: true });

    const block = editor.document[0];
    expect(block.type).toBe("codeBlock");
    expect(block.id).toBe("test-paragraph");
    expect((block.props as any).language).toBe("text");
    expect(block.content).toEqual([
      { type: "text", text: "const x", styles: {} },
    ]);
  });

  it("ignores Mod-Alt-c in a block without inline content", ({ editor }) => {
    editor.setTextCursorPosition("test-image");
    pressKey(editor, "c", { ctrlKey: !onMac, metaKey: onMac, altKey: true });

    expect(editor.document[1].type).toBe("image");
  });
});
