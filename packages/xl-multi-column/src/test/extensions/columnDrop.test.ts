import { getNodeById } from "@blocknote/core";
import { closeHistory } from "@tiptap/pm/history";
import { Fragment, Slice } from "prosemirror-model";
import { describe, expect, it, vi } from "vite-plus/test";

import { createMultiColumnHandleDropPlugin } from "../../extensions/DropCursor/multiColumnHandleDropPlugin.js";
import { detectEdgePosition } from "../../extensions/DropCursor/multiColumnDropCursor.js";
import { setupTestEnv } from "../setupTestEnv.js";

vi.mock("../../extensions/DropCursor/multiColumnDropCursor.js", () => ({
  detectEdgePosition: vi.fn(),
}));

const getEditor = setupTestEnv();

/** Drops the blocks on an edge of `target`, as the drop handler sees it. */
function dropOnEdge(ids: string[], target: string, position: "left" | "right") {
  const editor = getEditor();
  const view = editor.prosemirrorView;
  const column = getNodeById(target, view.state.doc)!;
  vi.mocked(detectEdgePosition).mockReturnValue({ ...column, position });
  const nodes = ids.map((id) => getNodeById(id, view.state.doc)!.node);
  const plugin = createMultiColumnHandleDropPlugin(editor);
  return plugin.props.handleDrop!.call(
    plugin,
    view,
    Object.assign(new MouseEvent("drop"), { dataTransfer: null }),
    new Slice(Fragment.from(nodes), 0, 0),
    true,
  );
}

describe("column edge drops", () => {
  it.each(["column-0", "paragraph-1"])(
    "places the cursor in the final nested child when dropping beside %s",
    (target) => {
      const editor = getEditor();
      dropOnEdge(["paragraph-0"], target, "right");
      expect(editor.getTextCursorPosition().block.id).toBe(
        "nested-paragraph-0",
      );
      expect(editor.prosemirrorState.selection.$from.parentOffset).toBe(
        "Nested Paragraph 0".length,
      );
    },
  );

  it.each(["column-0", "paragraph-0"])(
    "undoes immediate typing separately from the drop beside %s",
    (target) => {
      const editor = getEditor();
      editor.transact((tr) => closeHistory(tr));
      const before = editor.document;
      dropOnEdge(["paragraph-1"], target, "right");
      const dropped = editor.document;
      editor.transact((tr) => tr.insertText("typed"));
      expect(editor.undo()).toBe(true);
      expect(editor.document).toEqual(dropped);
      expect(editor.undo()).toBe(true);
      expect(editor.document).toEqual(before);
    },
  );

  it.each(["left", "right"] as const)(
    "moves a mixed selection to an emptied target's %s edge",
    (edge) => {
      const editor = getEditor();
      editor.insertBlocks(
        [
          {
            id: "column-last",
            type: "column",
            children: [{ id: "last", type: "paragraph", content: "Last" }],
          },
        ],
        "column-1",
        "after",
      );
      const dragged = [
        "column-paragraph-1",
        "column-paragraph-2",
        "column-paragraph-3",
      ];
      expect(dropOnEdge(dragged, "column-1", edge)).toBe(true);
      expect(
        editor
          .getBlock("column-list-0")!
          .children.map((column) => column.children.map((block) => block.id)),
      ).toEqual([["column-paragraph-0"], dragged, ["last"]]);
      expect(() => editor.prosemirrorState.doc.check()).not.toThrow();
    },
  );

  it("preserves the column when dropping only its own children", () => {
    const editor = getEditor();
    const before = editor.document;
    dropOnEdge(
      ["column-paragraph-0", "column-paragraph-1"],
      "column-0",
      "right",
    );
    expect(editor.document).toEqual(before);
  });

  it("unwraps the layout when all its blocks are dropped together", () => {
    const editor = getEditor();
    const dragged = [
      "column-paragraph-0",
      "column-paragraph-1",
      "column-paragraph-2",
      "column-paragraph-3",
    ];
    dropOnEdge(dragged, "column-0", "left");
    expect(editor.getBlock("column-list-0")).toBeUndefined();
    expect(editor.document.map((block) => block.id)).toEqual([
      "paragraph-0",
      "paragraph-1",
      ...dragged,
      "paragraph-2",
    ]);
    expect(() => editor.prosemirrorState.doc.check()).not.toThrow();
  });
});

// Dropping blocks onto themselves does nothing, like dropping a block next to
// itself. Removing the dragged blocks from where they are used to remove the
// drop target with them, and the handler then threw when it updated the
// target (`Block with ID ... not found`).
describe("drops whose target the dragged blocks hold", () => {
  it("does nothing when the dragged blocks hold the target's column list", () => {
    const editor = getEditor();
    const before = editor.document;
    // A block selection that spans the paragraph above the column list and
    // the whole list (e.g. extended with Shift+Arrow from the paragraph into
    // a column), dragged by one of the list's blocks.
    expect(
      dropOnEdge(["paragraph-1", "column-list-0"], "column-0", "right"),
    ).toBe(true);
    expect(editor.document).toEqual(before);
  });

  it("does nothing when a dragged block holds the target", () => {
    const editor = getEditor();
    const before = editor.document;
    expect(dropOnEdge(["paragraph-0"], "nested-paragraph-0", "left")).toBe(
      true,
    );
    expect(editor.document).toEqual(before);
  });
});
