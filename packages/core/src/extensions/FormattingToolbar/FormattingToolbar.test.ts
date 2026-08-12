import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vite-plus/test";

import { PartialBlock } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { formattingToolbarShouldShow } from "./FormattingToolbar.js";

describe("formattingToolbarShouldShow", () => {
  let editor: BlockNoteEditor;
  const div = document.createElement("div");

  const testDocument: PartialBlock[] = [
    { id: "paragraph-0", type: "paragraph", content: "Paragraph 0" },
    { id: "paragraph-1", type: "paragraph", content: "Paragraph 1" },
    { id: "code-0", type: "codeBlock", content: "const x = 0;" },
    { id: "code-1", type: "codeBlock", content: "const y = 1;" },
    { id: "paragraph-2", type: "paragraph", content: "Paragraph 2" },
  ];

  const shouldShow = () =>
    editor.transact((tr) => formattingToolbarShouldShow(tr));

  beforeAll(() => {
    editor = BlockNoteEditor.create();
    editor.mount(div);
  });

  afterAll(() => {
    editor._tiptapEditor.destroy();
    editor = undefined as any;
  });

  beforeEach(() => {
    editor.replaceBlocks(editor.document, testDocument);
  });

  it("does not show for an empty selection", () => {
    editor.setTextCursorPosition("paragraph-0");

    expect(shouldShow()).toBe(false);
  });

  it("shows for a selection spanning regular content", () => {
    editor.setSelection("paragraph-0", "paragraph-1");

    expect(shouldShow()).toBe(true);
  });

  it("does not show for a selection entirely within code", () => {
    editor.setSelection("code-0", "code-1");

    expect(shouldShow()).toBe(false);
  });

  it("shows for a selection spanning both a code block and regular content (#2865)", () => {
    editor.setSelection("paragraph-1", "code-0");

    expect(shouldShow()).toBe(true);
  });
});
