import { getNodeById } from "@blocknote/core";
import { Fragment, Slice } from "prosemirror-model";
import { describe, expect, it, vi } from "vite-plus/test";

import { createMultiColumnHandleDropPlugin } from "../../extensions/DropCursor/multiColumnHandleDropPlugin.js";
import { detectEdgePosition } from "../../extensions/DropCursor/multiColumnDropCursor.js";
import { setupTestEnv } from "../setupTestEnv.js";

vi.mock("../../extensions/DropCursor/multiColumnDropCursor.js", () => ({
  detectEdgePosition: vi.fn(),
}));

const getEditor = setupTestEnv();

function dropOnColumn(
  ids: string[],
  target: string,
  position: "left" | "right",
) {
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
      expect(dropOnColumn(dragged, "column-1", edge)).toBe(true);
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
    dropOnColumn(
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
    dropOnColumn(dragged, "column-0", "left");
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
