import { describe, expect } from "vite-plus/test";
import type { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { trackPosition } from "./positionMapping.js";

const it = globalThis.it.extend<{ editor: BlockNoteEditor }>({
  editor: async ({ setupEditor }, use) => {
    const { editor } = await setupEditor({
      initialContent: [{ id: "paragraph", content: "Hello World" }],
    });
    await use(editor);
  },
});

describe("PositionStorage with local editor", () => {
  describe("mount and unmount", () => {
    it("should return a position getter on creation (unmounted)", ({
      editor,
    }) => {
      const getPos = trackPosition(editor, 0);

      expect(typeof getPos).toBe("function");
      expect(getPos()).toBe(0);
    });
  });

  describe("set and get positions", () => {
    it("should store and retrieve positions without Y.js", ({ editor }) => {
      const getPos = trackPosition(editor, 10);

      expect(getPos()).toBe(10);
    });

    it("should handle right side positions", ({ editor }) => {
      const getPos = trackPosition(editor, 10, "right");

      expect(getPos()).toBe(10);
    });
  });

  it("should update mapping for local transactions before the position", ({
    editor,
  }) => {
    const getPos = trackPosition(editor, 10);

    editor.setTextCursorPosition("paragraph", "start");
    editor.insertInlineContent("Test");

    expect(getPos()).toBe(14);
  });

  it("should not update mapping for local transactions after the position", ({
    editor,
  }) => {
    const getPos = trackPosition(editor, 10);

    editor.setTextCursorPosition("paragraph", "end");
    editor.insertInlineContent("Test");

    expect(getPos()).toBe(10);
  });

  it("should track positions on each side", ({ editor }) => {
    const getCursorPos = trackPosition(editor, 6);
    const getStartPos = trackPosition(editor, 3);
    const getStartRightPos = trackPosition(editor, 3, "right");
    const getPosAfterPos = trackPosition(editor, 4);
    const getPosAfterRightPos = trackPosition(editor, 4, "right");

    editor.setTextCursorPosition("paragraph", "start");
    editor.insertInlineContent("Test ");

    expect(getCursorPos()).toBe(11); // 6 + 5 ("Test " length)
    expect(getStartPos()).toBe(3);
    expect(getStartRightPos()).toBe(8); // 3 + 5 ("Test " length)
    expect(getPosAfterPos()).toBe(9); // 4 + 5 ("Test " length)
    expect(getPosAfterRightPos()).toBe(9);
  });

  it("should handle multiple transactions", ({ editor }) => {
    const getCursorPos = trackPosition(editor, 6);
    const getStartPos = trackPosition(editor, 3);
    const getStartRightPos = trackPosition(editor, 3, "right");
    const getPosAfterPos = trackPosition(editor, 4);
    const getPosAfterRightPos = trackPosition(editor, 4, "right");

    editor.setTextCursorPosition("paragraph", "start");
    for (const text of "Test ") {
      editor.insertInlineContent(text);
    }

    expect(getCursorPos()).toBe(11); // 6 + 5 ("Test " length)
    expect(getStartPos()).toBe(3);
    expect(getStartRightPos()).toBe(8); // 3 + 5 ("Test " length)
    expect(getPosAfterPos()).toBe(9); // 4 + 5 ("Test " length)
    expect(getPosAfterRightPos()).toBe(9);
  });
});
