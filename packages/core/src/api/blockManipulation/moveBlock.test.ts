import { NodeSelection, TextSelection } from "prosemirror-state";
import { CellSelection } from "prosemirror-tables";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PartialBlock } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { getBlockInfoFromPos } from "../getBlockInfoFromPos.js";
import {
  moveBlockDown,
  moveBlockUp,
  moveSelectedBlockAndSelection,
} from "./moveBlock.js";

const blocks: PartialBlock[] = [
  {
    id: "paragraph-0",
    type: "paragraph",
    content: "Paragraph 0",
  },
  {
    id: "paragraph-1",
    type: "paragraph",
    content: "Paragraph 1",
    children: [
      {
        id: "nested-paragraph-1",
        type: "paragraph",
        content: "Nested Paragraph 1",
      },
    ],
  },
  {
    id: "paragraph-2",
    type: "paragraph",
    content: "Paragraph 2",
  },
  {
    id: "paragraph-3",
    type: "paragraph",
    content: "Paragraph 3",
  },
  {
    id: "image-1",
    type: "image",
    props: {
      url: "https://via.placeholder.com/150",
    },
  },
  {
    id: "table-1",
    type: "table",
    content: {
      type: "tableContent",
      rows: [
        {
          cells: ["Cell 1", "Cell 2", "Cell 3"],
        },
        {
          cells: ["Cell 4", "Cell 5", "Cell 6"],
        },
        {
          cells: ["Cell 7", "Cell 8", "Cell 9"],
        },
      ],
    },
  },
  {
    id: "trailing-paragraph",
    type: "paragraph",
  },
];

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
  editor.replaceBlocks(editor.document, blocks);
});

describe("Test moveSelectedBlockAndSelection", () => {
  it("Text selection", () => {
    editor.setTextCursorPosition("paragraph-2");
    makeSelectionSpanContent("text");

    moveSelectedBlockAndSelection(editor, "paragraph-0", "before");

    const selection = editor._tiptapEditor.state.selection;
    editor.setTextCursorPosition("paragraph-2");
    makeSelectionSpanContent("text");

    expect(selection.eq(editor._tiptapEditor.state.selection)).toBeTruthy();
  });

  it("Node selection", () => {
    editor.setTextCursorPosition("image-1");
    makeSelectionSpanContent("node");

    moveSelectedBlockAndSelection(editor, "paragraph-0", "before");

    const selection = editor._tiptapEditor.state.selection;
    editor.setTextCursorPosition("image-1");
    makeSelectionSpanContent("node");

    expect(selection.eq(editor._tiptapEditor.state.selection)).toBeTruthy();
  });

  it("Cell selection", () => {
    editor.setTextCursorPosition("table-1");
    makeSelectionSpanContent("cell");

    moveSelectedBlockAndSelection(editor, "paragraph-0", "before");

    const selection = editor._tiptapEditor.state.selection;
    editor.setTextCursorPosition("table-1");
    makeSelectionSpanContent("cell");

    expect(selection.eq(editor._tiptapEditor.state.selection)).toBeTruthy();
  });
});

describe("Test moveBlockUp", () => {
  it("Basic", () => {
    editor.setTextCursorPosition("paragraph-3");

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
    editor.setTextCursorPosition("paragraph-2");

    moveBlockDown(editor);

    expect(editor.document).toMatchSnapshot();
  });

  it("Into children", () => {
    editor.setTextCursorPosition("paragraph-0");

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
