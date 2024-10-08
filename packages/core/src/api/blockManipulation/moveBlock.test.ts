import { NodeSelection, TextSelection } from "prosemirror-state";
import { CellSelection } from "prosemirror-tables";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { getBlockInfoFromPos } from "../getBlockInfoFromPos.js";
import {
  moveBlockDown,
  moveBlockUp,
  moveSelectedBlockAndSelection,
} from "./moveBlock.js";
import { testDocument } from "./testDocument.js";

let editor: BlockNoteEditor;
const div = document.createElement("div");

function makeSelectionSpanContent(selectionType: "text" | "node" | "cell") {
  const { startPos, contentNode } = getBlockInfoFromPos(
    editor._tiptapEditor.state.doc,
    editor._tiptapEditor.state.selection.from
  );

  if (selectionType === "cell") {
    editor._tiptapEditor.view.dispatch(
      editor._tiptapEditor.state.tr.setSelection(
        CellSelection.create(
          editor._tiptapEditor.state.doc,
          editor._tiptapEditor.state.doc.resolve(startPos + 3).before(),
          editor._tiptapEditor.state.doc
            .resolve(startPos + contentNode.nodeSize - 3)
            .before()
        )
      )
    );
  } else if (selectionType === "node") {
    const resolvedContentStartPos =
      editor._tiptapEditor.state.doc.resolve(startPos);

    editor._tiptapEditor.view.dispatch(
      editor._tiptapEditor.state.tr.setSelection(
        NodeSelection.create(
          editor._tiptapEditor.state.doc,
          editor._tiptapEditor.state.doc
            .resolve(
              resolvedContentStartPos.after(resolvedContentStartPos.depth + 1)
            )
            .start()
        )
      )
    );
  } else {
    const resolvedContentStartPos =
      editor._tiptapEditor.state.doc.resolve(startPos);
    const resolvedContentEndPos = editor._tiptapEditor.state.doc.resolve(
      startPos + contentNode.nodeSize
    );

    editor._tiptapEditor.view.dispatch(
      editor._tiptapEditor.state.tr.setSelection(
        TextSelection.create(
          editor._tiptapEditor.state.doc,
          editor._tiptapEditor.state.doc
            .resolve(
              resolvedContentStartPos.after(resolvedContentStartPos.depth + 1)
            )
            .start(),
          editor._tiptapEditor.state.doc
            .resolve(
              resolvedContentEndPos.before(resolvedContentEndPos.depth + 1)
            )
            .end()
        )
      )
    );
  }
}

beforeAll(() => {
  editor = BlockNoteEditor.create();
  editor.mount(div);
});

afterAll(() => {
  editor.mount(undefined);
  editor._tiptapEditor.destroy();
  editor = undefined as any;
});

beforeEach(() => {
  editor.replaceBlocks(editor.document, testDocument);
});

describe("Test moveSelectedBlockAndSelection", () => {
  it("Text selection", () => {
    editor.setTextCursorPosition("paragraph-1");
    makeSelectionSpanContent("text");

    moveSelectedBlockAndSelection(editor, "paragraph-0", "before");

    const selection = editor._tiptapEditor.state.selection;
    editor.setTextCursorPosition("paragraph-1");
    makeSelectionSpanContent("text");

    expect(selection.eq(editor._tiptapEditor.state.selection)).toBeTruthy();
  });

  it("Node selection", () => {
    editor.setTextCursorPosition("image-0");
    makeSelectionSpanContent("node");

    moveSelectedBlockAndSelection(editor, "paragraph-0", "before");

    const selection = editor._tiptapEditor.state.selection;
    editor.setTextCursorPosition("image-0");
    makeSelectionSpanContent("node");

    expect(selection.eq(editor._tiptapEditor.state.selection)).toBeTruthy();
  });

  it("Cell selection", () => {
    editor.setTextCursorPosition("table-0");
    makeSelectionSpanContent("cell");

    moveSelectedBlockAndSelection(editor, "paragraph-0", "before");

    const selection = editor._tiptapEditor.state.selection;
    editor.setTextCursorPosition("table-0");
    makeSelectionSpanContent("cell");

    expect(selection.eq(editor._tiptapEditor.state.selection)).toBeTruthy();
  });
});

describe("Test moveBlockUp", () => {
  it("Basic", () => {
    editor.setTextCursorPosition("paragraph-1");

    moveBlockUp(editor);

    expect(editor.document).toMatchSnapshot();
  });

  it("Into children", () => {
    editor.setTextCursorPosition("paragraph-2");

    moveBlockUp(editor);

    expect(editor.document).toMatchSnapshot();
  });

  it("Out of children", () => {
    editor.setTextCursorPosition("nested-paragraph-1");

    moveBlockUp(editor);

    expect(editor.document).toMatchSnapshot();
  });

  it("First block", () => {
    editor.setTextCursorPosition("paragraph-0");

    moveBlockUp(editor);

    expect(editor.document).toMatchSnapshot();
  });
});

describe("Test moveBlockDown", () => {
  it("Basic", () => {
    editor.setTextCursorPosition("paragraph-0");

    moveBlockDown(editor);

    expect(editor.document).toMatchSnapshot();
  });

  it("Into children", () => {
    editor.setTextCursorPosition("paragraph-1");

    moveBlockDown(editor);

    expect(editor.document).toMatchSnapshot();
  });

  it("Out of children", () => {
    editor.setTextCursorPosition("nested-paragraph-1");

    moveBlockDown(editor);

    expect(editor.document).toMatchSnapshot();
  });

  it("Last block", () => {
    editor.setTextCursorPosition("trailing-paragraph");

    moveBlockDown(editor);

    expect(editor.document).toMatchSnapshot();
  });
});
