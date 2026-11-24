import { TextSelection } from "prosemirror-state";
import { describe, expect } from "vite-plus/test";

import {
  installHeadlessPlugins,
  pressHeadlessKey,
} from "../../../extensions/testHeadlessEditor.js";
import { plainNoteContent, schema, text } from "./plainBlocks.fixture.js";

const it = globalThis.it.extend<{
  withEditor: (content?: string) => Promise<typeof schema.BlockNoteEditor>;
}>({
  withEditor: async ({ setupEditor }, use) => {
    await use(async (content = "Source") => {
      const { editor } = await setupEditor({
        schema,
        initialContent: plainNoteContent(content),
      });
      installHeadlessPlugins(editor);
      return editor;
    });
  },
});

function press(
  editor: typeof schema.BlockNoteEditor,
  key: "Enter" | "Backspace" | "Delete" | "Tab",
  shiftKey = false,
) {
  return pressHeadlessKey(editor, {
    key,
    code: key,
    keyCode: { Enter: 13, Backspace: 8, Delete: 46, Tab: 9 }[key],
    shiftKey,
  });
}

describe("plain blocks whose Enter goes into their children", () => {
  it.for(["", "Source"])(
    "Enter starts the body and preserves children for %j",
    async (content, { withEditor }) => {
      const editor = await withEditor(content);
      editor.setTextCursorPosition("note", "end");
      press(editor, "Enter");
      expect(editor.document.map((block) => block.id)).toEqual([
        "note",
        "after",
      ]);
      expect(
        editor.getBlock("note")!.children.map((block) => block.id),
      ).toEqual([expect.any(String), "body"]);
      expect(text(editor, "body")).toBe("Explanation");
      expect(editor.getTextCursorPosition().block.id).toBe(
        editor.getBlock("note")!.children[0].id,
      );
      editor.transact(({ doc }) => doc.check());
    },
  );

  it("Enter moves the remaining plain text into the body", async ({
    withEditor,
  }) => {
    const editor = await withEditor("Source");
    editor.setTextCursorPosition("note", "start");
    editor.transact((tr) =>
      tr.setSelection(TextSelection.create(tr.doc, tr.selection.from + 3)),
    );
    press(editor, "Enter");
    expect(text(editor, "note")).toBe("Sou");
    expect(text(editor, editor.getBlock("note")!.children[0].id)).toBe("rce");
    expect(text(editor, "body")).toBe("Explanation");
  });

  it("Shift-Enter inserts a newline without moving children", async ({
    withEditor,
  }) => {
    const editor = await withEditor();
    editor.setTextCursorPosition("note", "end");
    press(editor, "Enter", true);
    expect(text(editor, "note")).toBe("Source\n");
    expect(editor.getBlock("note")!.children.map((block) => block.id)).toEqual([
      "body",
    ]);
    editor.transact(({ doc }) => doc.check());
  });

  it("Backspace in the block after merges it into the body's last block", async ({
    withEditor,
  }) => {
    const editor = await withEditor();
    editor.setTextCursorPosition("after", "start");
    press(editor, "Backspace");

    // As after any block with children: the text is appended to the last
    // block above it.
    expect(text(editor, "body")).toBe("ExplanationAfter");
    expect(editor.document.map((block) => block.id)).toEqual(["note"]);
  });

  it("keeps its children inside when Shift-Tab is pressed", async ({
    withEditor,
  }) => {
    const editor = await withEditor();
    editor.setTextCursorPosition("body", "start");
    press(editor, "Tab", true);
    expect(editor.getBlock("note")!.children.map((block) => block.id)).toEqual([
      "body",
    ]);
  });
});
