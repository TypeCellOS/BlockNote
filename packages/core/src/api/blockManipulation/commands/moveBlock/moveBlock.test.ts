import { NodeSelection, TextSelection } from "prosemirror-state";
import { CellSelection } from "prosemirror-tables";
import { describe, expect, it } from "vitest";

import { getBlockInfoFromPos } from "../../../getBlockInfoFromPos.js";
import {
  moveBlockDown,
  moveBlockUp,
  moveSelectedBlockAndSelection,
} from "./moveBlock.js";
import { setupTestEnv } from "../../setupTestEnv.js";

const getEditor = setupTestEnv();

function makeSelectionSpanContent(selectionType: "text" | "node" | "cell") {
  const { startPos, contentNode } = getBlockInfoFromPos(
    getEditor()._tiptapEditor.state.doc,
    getEditor()._tiptapEditor.state.selection.from
  );

  if (selectionType === "cell") {
    getEditor()._tiptapEditor.view.dispatch(
      getEditor()._tiptapEditor.state.tr.setSelection(
        CellSelection.create(
          getEditor()._tiptapEditor.state.doc,
          getEditor()
            ._tiptapEditor.state.doc.resolve(startPos + 3)
            .before(),
          getEditor()
            ._tiptapEditor.state.doc.resolve(
              startPos + contentNode.nodeSize - 3
            )
            .before()
        )
      )
    );
  } else if (selectionType === "node") {
    const resolvedContentStartPos =
      getEditor()._tiptapEditor.state.doc.resolve(startPos);

    getEditor()._tiptapEditor.view.dispatch(
      getEditor()._tiptapEditor.state.tr.setSelection(
        NodeSelection.create(
          getEditor()._tiptapEditor.state.doc,
          getEditor()
            ._tiptapEditor.state.doc.resolve(
              resolvedContentStartPos.after(resolvedContentStartPos.depth + 1)
            )
            .start()
        )
      )
    );
  } else {
    const resolvedContentStartPos =
      getEditor()._tiptapEditor.state.doc.resolve(startPos);
    const resolvedContentEndPos = getEditor()._tiptapEditor.state.doc.resolve(
      startPos + contentNode.nodeSize
    );

    getEditor()._tiptapEditor.view.dispatch(
      getEditor()._tiptapEditor.state.tr.setSelection(
        TextSelection.create(
          getEditor()._tiptapEditor.state.doc,
          getEditor()
            ._tiptapEditor.state.doc.resolve(
              resolvedContentStartPos.after(resolvedContentStartPos.depth + 1)
            )
            .start(),
          getEditor()
            ._tiptapEditor.state.doc.resolve(
              resolvedContentEndPos.before(resolvedContentEndPos.depth + 1)
            )
            .end()
        )
      )
    );
  }
}

describe("Test moveSelectedBlockAndSelection", () => {
  it("Text selection", () => {
    getEditor().setTextCursorPosition("paragraph-1");
    makeSelectionSpanContent("text");

    moveSelectedBlockAndSelection(getEditor(), "paragraph-0", "before");

    const selection = getEditor()._tiptapEditor.state.selection;
    getEditor().setTextCursorPosition("paragraph-1");
    makeSelectionSpanContent("text");

    expect(
      selection.eq(getEditor()._tiptapEditor.state.selection)
    ).toBeTruthy();
  });

  it("Node selection", () => {
    getEditor().setTextCursorPosition("image-0");
    makeSelectionSpanContent("node");

    moveSelectedBlockAndSelection(getEditor(), "paragraph-0", "before");

    const selection = getEditor()._tiptapEditor.state.selection;
    getEditor().setTextCursorPosition("image-0");
    makeSelectionSpanContent("node");

    expect(
      selection.eq(getEditor()._tiptapEditor.state.selection)
    ).toBeTruthy();
  });

  it("Cell selection", () => {
    getEditor().setTextCursorPosition("table-0");
    makeSelectionSpanContent("cell");

    moveSelectedBlockAndSelection(getEditor(), "paragraph-0", "before");

    const selection = getEditor()._tiptapEditor.state.selection;
    getEditor().setTextCursorPosition("table-0");
    makeSelectionSpanContent("cell");

    expect(
      selection.eq(getEditor()._tiptapEditor.state.selection)
    ).toBeTruthy();
  });
});

describe("Test moveBlockUp", () => {
  it("Basic", () => {
    getEditor().setTextCursorPosition("paragraph-1");

    moveBlockUp(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Into children", () => {
    getEditor().setTextCursorPosition("paragraph-2");

    moveBlockUp(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Out of children", () => {
    getEditor().setTextCursorPosition("nested-paragraph-1");

    moveBlockUp(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("First block", () => {
    getEditor().setTextCursorPosition("paragraph-0");

    moveBlockUp(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });
});

describe("Test moveBlockDown", () => {
  it("Basic", () => {
    getEditor().setTextCursorPosition("paragraph-0");

    moveBlockDown(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Into children", () => {
    getEditor().setTextCursorPosition("paragraph-1");

    moveBlockDown(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Out of children", () => {
    getEditor().setTextCursorPosition("nested-paragraph-1");

    moveBlockDown(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Last block", () => {
    getEditor().setTextCursorPosition("trailing-paragraph");

    moveBlockDown(getEditor());

    expect(getEditor().document).toMatchSnapshot();
  });
});
