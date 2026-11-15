import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vite-plus/test";
import { TextSelection } from "prosemirror-state";
import { BlockNoteEditor } from "../editor/BlockNoteEditor.js";

/**
 * @vitest-environment jsdom
 */

// Types one character at a time through `handleTextInput`, so input rules run
// the same way they do for keyboard input.
function typeString(editor: BlockNoteEditor, str: string) {
  const view = editor.prosemirrorView;
  for (const char of str) {
    const { from, to } = view.state.selection;
    const deflt = () => view.state.tr.insertText(char, from, to);
    const handled = view.someProp("handleTextInput", (f) =>
      f(view, from, to, char, deflt),
    );
    if (!handled) {
      view.dispatch(deflt());
    }
  }
}

function moveCursor(editor: BlockNoteEditor, offset: number) {
  const view = editor.prosemirrorView;
  const pos = view.state.selection.from + offset;
  view.dispatch(
    view.state.tr.setSelection(TextSelection.create(view.state.doc, pos)),
  );
}

describe("Code mark input rule", () => {
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
    editor.replaceBlocks(editor.document, [
      { id: "paragraph", type: "paragraph", content: "" },
    ]);
    editor.setTextCursorPosition("paragraph", "start");
  });

  it("keeps the character before the opening backtick", () => {
    typeString(editor, "Some text (`code`");
    expect(editor.document[0].content).toEqual([
      { type: "text", text: "Some text (", styles: {} },
      { type: "text", text: "code", styles: { code: true } },
    ]);
  });

  it("keeps the character before the opening backtick when a space closes the code", () => {
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

  it("ignores a backtick right after another backtick", () => {
    typeString(editor, "``code`");
    expect(editor.document[0].content).toEqual([
      { type: "text", text: "``code`", styles: {} },
    ]);
  });

  it("converts backticks at the start of a block", () => {
    typeString(editor, "`code`");
    expect(editor.document[0].content).toEqual([
      { type: "text", text: "code", styles: { code: true } },
    ]);
  });
});
