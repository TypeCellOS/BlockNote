import { describe, expect } from "vite-plus/test";
import { TextSelection } from "prosemirror-state";
import type { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import {
  installHeadlessPlugins,
  typeText as typeString,
} from "../extensions/testHeadlessEditor.js";

function moveCursor(editor: BlockNoteEditor, offset: number) {
  const view = editor.prosemirrorView;
  const pos = view.state.selection.from + offset;
  view.dispatch(
    view.state.tr.setSelection(TextSelection.create(view.state.doc, pos)),
  );
}

describe("Code mark input rule", () => {
  const it = globalThis.it.extend<{ editor: BlockNoteEditor }>({
    editor: async ({ setupEditor }, use) => {
      const { editor } = await setupEditor({
        initialContent: [{ id: "paragraph", type: "paragraph", content: "" }],
      });
      installHeadlessPlugins(editor);
      editor.setTextCursorPosition("paragraph", "start");
      await use(editor);
    },
  });

  it("keeps the character before the opening backtick", ({ editor }) => {
    typeString(editor, "Some text (`code`");
    expect(editor.document[0].content).toEqual([
      { type: "text", text: "Some text (", styles: {} },
      { type: "text", text: "code", styles: { code: true } },
    ]);
  });

  it("keeps the character before the opening backtick when a space closes the code", ({
    editor,
  }) => {
    typeString(editor, "Some text (``");
    moveCursor(editor, -1);
    typeString(editor, "code");
    moveCursor(editor, 1);
    typeString(editor, " ");
    expect(editor.document[0].content).toEqual([
      { type: "text", text: "Some text (", styles: {} },
      { type: "text", text: "code", styles: { code: true } },
      { type: "text", text: " ", styles: {} },
    ]);
  });

  it("ignores a backtick right after another backtick", ({ editor }) => {
    typeString(editor, "``code`");
    expect(editor.document[0].content).toEqual([
      { type: "text", text: "``code`", styles: {} },
    ]);
  });

  it("converts backticks at the start of a block", ({ editor }) => {
    typeString(editor, "`code`");
    expect(editor.document[0].content).toEqual([
      { type: "text", text: "code", styles: { code: true } },
    ]);
  });
});
