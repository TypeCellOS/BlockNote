import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

import { PartialBlock } from "../../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";

/**
 * Android virtual keyboards don't dispatch regular `Backspace` key events
 * (they use keyCode 229), so backspace presses only surface as `beforeinput`
 * events with the `deleteContentBackward` input type. These tests simulate
 * that by dispatching such events without a preceding `Backspace` key event.
 */
function setupTestEnv() {
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

  return (doc: PartialBlock[]) => {
    editor.replaceBlocks(editor.document, doc);
    return editor;
  };
}

const withEditor = setupTestEnv();

function dispatchDeleteContentBackward(editor: BlockNoteEditor) {
  const event = new InputEvent("beforeinput", {
    inputType: "deleteContentBackward",
    bubbles: true,
    cancelable: true,
  });
  editor.prosemirrorView!.dom.dispatchEvent(event);
  return event;
}

describe("deleteContentBackward input events (Android backspace)", () => {
  it("converts a bullet list item to a paragraph at the start of the block", () => {
    const editor = withEditor([
      {
        id: "bullet-0",
        type: "bulletListItem",
        content: "List item 0",
      },
      {
        id: "bullet-1",
        type: "bulletListItem",
        content: "List item 1",
      },
    ]);
    editor.setTextCursorPosition("bullet-1", "start");

    const event = dispatchDeleteContentBackward(editor);

    expect(event.defaultPrevented).toBe(true);
    expect(editor.getBlock("bullet-1")!.type).toBe("paragraph");
    expect(editor.getBlock("bullet-1")!.content).toEqual([
      { type: "text", text: "List item 1", styles: {} },
    ]);
  });

  it("lifts a nested block at the start of the block", () => {
    const editor = withEditor([
      {
        id: "paragraph-0",
        type: "paragraph",
        content: "Paragraph 0",
        children: [
          {
            id: "nested-paragraph-0",
            type: "paragraph",
            content: "Nested Paragraph 0",
          },
        ],
      },
    ]);
    editor.setTextCursorPosition("nested-paragraph-0", "start");

    const event = dispatchDeleteContentBackward(editor);

    expect(event.defaultPrevented).toBe(true);
    expect(editor.getBlock("paragraph-0")!.children).toEqual([]);
    expect(editor.getBlock("nested-paragraph-0")).toBeDefined();
  });

  it("does not prevent the default behavior in the middle of a block", () => {
    const editor = withEditor([
      {
        id: "paragraph-0",
        type: "paragraph",
        content: "Paragraph 0",
      },
    ]);
    editor.setTextCursorPosition("paragraph-0", "end");

    const event = dispatchDeleteContentBackward(editor);

    // The browser's native behavior (deleting a character) should be left
    // alone, as it matches what a `Backspace` key press would do.
    expect(event.defaultPrevented).toBe(false);
    expect(editor.getBlock("paragraph-0")!.content).toEqual([
      { type: "text", text: "Paragraph 0", styles: {} },
    ]);
  });
});
