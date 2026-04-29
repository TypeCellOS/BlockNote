import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { PartialBlock } from "../defaultBlocks.js";
import { getLanguageId, type CodeBlockOptions } from "./block.js";

/**
 * @vitest-environment jsdom
 */

/**
 * Simulate typing text into the editor at the current cursor position.
 * This triggers input rules by calling the view's handleTextInput prop,
 * which is how ProseMirror processes keyboard text input.
 */
function simulateTextInput(editor: BlockNoteEditor, text: string) {
  const view = editor.prosemirrorView;
  const { from, to } = view.state.selection;
  const deflt = () => view.state.tr.insertText(text, from, to);
  const handled = view.someProp("handleTextInput", (f) =>
    f(view, from, to, text, deflt),
  );
  if (!handled) {
    view.dispatch(deflt());
  }
}

function typeString(editor: BlockNoteEditor, str: string) {
  for (const char of str) {
    simulateTextInput(editor, char);
  }
}

/**
 * Simulate a keyboard shortcut by invoking the view's handleKeyDown prop,
 * which is how ProseMirror routes keymap-based handlers like Enter.
 */
function pressKey(editor: BlockNoteEditor, key: string) {
  const view = editor.prosemirrorView;
  const event = new KeyboardEvent("keydown", { key });
  view.someProp("handleKeyDown", (f) => f(view, event));
}

describe("Code block input rule", () => {
  let editor: BlockNoteEditor;
  const div = document.createElement("div");

  beforeAll(() => {
    editor = BlockNoteEditor.create();
    editor.mount(div);
  });

  afterAll(() => {
    editor._tiptapEditor.destroy();
    editor = undefined as any;
  });

  beforeEach(() => {
    const testDoc: PartialBlock[] = [
      {
        id: "test-paragraph",
        type: "paragraph",
        content: "",
      },
    ];
    editor.replaceBlocks(editor.document, testDoc);
    editor.setTextCursorPosition("test-paragraph", "start");
  });

  it("converts ```ts + space into a codeBlock", () => {
    typeString(editor, "```ts ");

    const block = editor.document[0];
    expect(block.type).toBe("codeBlock");
    // Without supportedLanguages configured, the raw alias is used
    expect((block.props as any).language).toBe("ts");
  });

  it("converts ``` + space into a codeBlock with empty language", () => {
    typeString(editor, "``` ");

    const block = editor.document[0];
    expect(block.type).toBe("codeBlock");
    expect((block.props as any).language).toBe("");
  });

  it("converts ```javascript + space into a codeBlock", () => {
    typeString(editor, "```javascript ");

    const block = editor.document[0];
    expect(block.type).toBe("codeBlock");
    expect((block.props as any).language).toBe("javascript");
  });

  it("does not trigger input rule without trailing space", () => {
    typeString(editor, "```ts");

    const block = editor.document[0];
    expect(block.type).toBe("paragraph");
  });

  it("does not trigger with only two backticks", () => {
    typeString(editor, "``ts ");

    const block = editor.document[0];
    expect(block.type).toBe("paragraph");
  });

  it("does not trigger in non-empty paragraph with preceding text", () => {
    typeString(editor, "some text ```ts ");

    const block = editor.document[0];
    // The ^ anchor in the regex means it only triggers at the start of a block
    expect(block.type).toBe("paragraph");
  });

  it("code block content is empty after conversion", () => {
    typeString(editor, "```ts ");

    const block = editor.document[0];
    expect(block.type).toBe("codeBlock");
    expect(block.content).toEqual([]);
  });

  it("converts ```ts + Enter into a codeBlock", () => {
    typeString(editor, "```ts");
    pressKey(editor, "Enter");

    const block = editor.document[0];
    expect(block.type).toBe("codeBlock");
    expect((block.props as any).language).toBe("ts");
    expect(block.content).toEqual([]);
  });

  it("converts ``` + Enter into a codeBlock with empty language", () => {
    typeString(editor, "```");
    pressKey(editor, "Enter");

    const block = editor.document[0];
    expect(block.type).toBe("codeBlock");
    expect((block.props as any).language).toBe("");
  });

  it("converts ```javascript + Enter into a codeBlock", () => {
    typeString(editor, "```javascript");
    pressKey(editor, "Enter");

    const block = editor.document[0];
    expect(block.type).toBe("codeBlock");
    expect((block.props as any).language).toBe("javascript");
  });

  it("does not trigger Enter conversion in non-empty paragraph with preceding text", () => {
    typeString(editor, "some text ```ts");
    pressKey(editor, "Enter");

    const block = editor.document[0];
    expect(block.type).toBe("paragraph");
  });

  it("does not trigger Enter conversion with only two backticks", () => {
    typeString(editor, "``ts");
    pressKey(editor, "Enter");

    const block = editor.document[0];
    expect(block.type).toBe("paragraph");
  });

  it("places cursor inside the new code block after space conversion", () => {
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
    expect((after.content as Array<{ type: string; text: string }>)[0].text).toBe(
      "hello",
    );
  });

  it("places cursor inside the new code block after Enter conversion", () => {
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
    expect((after.content as Array<{ type: string; text: string }>)[0].text).toBe(
      "world",
    );
  });

  it("Enter inside an existing code block does not retrigger conversion", () => {
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

describe("getLanguageId", () => {
  const options: CodeBlockOptions = {
    supportedLanguages: {
      typescript: {
        name: "TypeScript",
        aliases: ["ts", "typescript"],
      },
      javascript: {
        name: "JavaScript",
        aliases: ["js", "javascript"],
      },
      python: {
        name: "Python",
        aliases: ["py", "python"],
      },
    },
  };

  it("resolves alias to language id", () => {
    expect(getLanguageId(options, "ts")).toBe("typescript");
    expect(getLanguageId(options, "js")).toBe("javascript");
    expect(getLanguageId(options, "py")).toBe("python");
  });

  it("resolves language id directly", () => {
    expect(getLanguageId(options, "typescript")).toBe("typescript");
    expect(getLanguageId(options, "javascript")).toBe("javascript");
  });

  it("returns undefined for unknown language", () => {
    expect(getLanguageId(options, "unknown")).toBeUndefined();
  });

  it("returns undefined with no supportedLanguages", () => {
    expect(getLanguageId({}, "ts")).toBeUndefined();
  });
});
