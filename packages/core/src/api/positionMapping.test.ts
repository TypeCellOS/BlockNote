/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vite-plus/test";
import { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { trackPosition } from "./positionMapping.js";

describe("PositionStorage with local editor", () => {
  describe("mount and unmount", () => {
    it("should return a position getter on creation (mounted)", () => {
      const editor = BlockNoteEditor.create();
      editor.mount(document.createElement("div"));

      const getPos = trackPosition(editor, 0);

      expect(typeof getPos).toBe("function");
      expect(getPos()).toBe(0);

      editor.unmount();
    });

    it("should return a position getter on creation (unmounted)", () => {
      const editor = BlockNoteEditor.create();

      const getPos = trackPosition(editor, 0);

      expect(typeof getPos).toBe("function");
      expect(getPos()).toBe(0);

      editor.unmount();
    });
  });

  describe("set and get positions", () => {
    it("should store and retrieve positions without Y.js", () => {
      const editor = BlockNoteEditor.create();
      editor.mount(document.createElement("div"));

      const getPos = trackPosition(editor, 10);

      expect(getPos()).toBe(10);

      editor.unmount();
    });

    it("should handle right side positions", () => {
      const editor = BlockNoteEditor.create();
      editor.mount(document.createElement("div"));

      const getPos = trackPosition(editor, 10, "right");

      expect(getPos()).toBe(10);

      editor.unmount();
    });
  });

  it("should update mapping for local transactions before the position", () => {
    const editor = BlockNoteEditor.create();
    editor.mount(document.createElement("div"));

    // Set initial content
    editor.insertBlocks(
      [
        {
          id: "1",
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Hello World",
              styles: {},
            },
          ],
        },
      ],
      editor.document[0],
      "before",
    );

    // Start tracking
    const getPos = trackPosition(editor, 10);

    // Move the cursor to the start of the document
    editor.setTextCursorPosition(editor.document[0], "start");

    // Insert text at the start of the document
    editor.insertInlineContent([
      {
        type: "text",
        text: "Test",
        styles: {},
      },
    ]);

    // Position should be updated according to mapping
    expect(getPos()).toBe(14);

    editor.unmount();
  });

  it("should not update mapping for local transactions after the position", () => {
    const editor = BlockNoteEditor.create();
    editor.mount(document.createElement("div"));

    // Set initial content
    editor.insertBlocks(
      [
        {
          id: "1",
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Hello World",
              styles: {},
            },
          ],
        },
      ],
      editor.document[0],
      "before",
    );
    // Start tracking
    const getPos = trackPosition(editor, 10);

    // Move the cursor to the end of the document
    editor.setTextCursorPosition(editor.document[0], "end");

    // Insert text at the end of the document
    editor.insertInlineContent([
      {
        type: "text",
        text: "Test",
        styles: {},
      },
    ]);

    // Position should not be updated
    expect(getPos()).toBe(10);

    editor.unmount();
  });

  it("should track positions on each side", () => {
    const editor = BlockNoteEditor.create();
    editor.mount(document.createElement("div"));

    editor.replaceBlocks(editor.document, [
      {
        type: "paragraph",
        content: "Hello World",
      },
    ]);

    // Store position at "Hello| World"
    const getCursorPos = trackPosition(editor, 6);
    const getStartPos = trackPosition(editor, 3);
    const getStartRightPos = trackPosition(editor, 3, "right");
    const getPosAfterPos = trackPosition(editor, 4);
    const getPosAfterRightPos = trackPosition(editor, 4, "right");
    // Insert text at the beginning
    editor._tiptapEditor.commands.insertContentAt(3, "Test ");

    // Position should be updated
    expect(getCursorPos()).toBe(11); // 6 + 5 ("Test " length)
    expect(getStartPos()).toBe(3); // 3
    expect(getStartRightPos()).toBe(8); // 3 + 5 ("Test " length)
    expect(getPosAfterPos()).toBe(9); // 4 + 5 ("Test " length)
    expect(getPosAfterRightPos()).toBe(9); // 4 + 5 ("Test " length)

    editor.unmount();
  });

  it("should handle multiple transactions", () => {
    const editor = BlockNoteEditor.create();
    editor.mount(document.createElement("div"));

    editor.replaceBlocks(editor.document, [
      {
        type: "paragraph",
        content: "Hello World",
      },
    ]);

    // Store position at "Hello| World"
    const getCursorPos = trackPosition(editor, 6);
    const getStartPos = trackPosition(editor, 3);
    const getStartRightPos = trackPosition(editor, 3, "right");
    const getPosAfterPos = trackPosition(editor, 4);
    const getPosAfterRightPos = trackPosition(editor, 4, "right");

    // Insert text at the beginning
    editor._tiptapEditor.commands.insertContentAt(3, "T");
    editor._tiptapEditor.commands.insertContentAt(4, "e");
    editor._tiptapEditor.commands.insertContentAt(5, "s");
    editor._tiptapEditor.commands.insertContentAt(6, "t");
    editor._tiptapEditor.commands.insertContentAt(7, " ");

    // Position should be updated
    expect(getCursorPos()).toBe(11); // 6 + 5 ("Test " length)
    expect(getStartPos()).toBe(3); // 3
    expect(getStartRightPos()).toBe(8); // 3 + 5 ("Test " length)
    expect(getPosAfterPos()).toBe(9); // 4 + 5 ("Test " length)
    expect(getPosAfterRightPos()).toBe(9); // 4 + 5 ("Test " length)

    editor.unmount();
  });
});
