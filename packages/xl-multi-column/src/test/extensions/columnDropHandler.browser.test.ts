// The drop handler reads the mounted view and DOM geometry.
import { getNodeById } from "@blocknote/core";
import { closeHistory } from "@tiptap/pm/history";
import { Fragment, Slice } from "prosemirror-model";
import { describe, expect, vi } from "vite-plus/test";

import { createMultiColumnHandleDropPlugin } from "../../extensions/DropCursor/multiColumnHandleDropPlugin.js";
import {
  multiColumnTestOptions,
  type MultiColumnTestEditor,
} from "../setupTestEnv.js";

/** Drops the blocks on an edge of `target`, as the drop handler sees it. */
function dropOnEdge(
  editor: MultiColumnTestEditor,
  ids: string[],
  target: string,
  position: "left" | "right",
) {
  const view = editor.prosemirrorView;
  const column = getNodeById(target, view.state.doc)!;
  const nodes = ids.map((id) => getNodeById(id, view.state.doc)!.node);
  const plugin = createMultiColumnHandleDropPlugin(editor);
  // Pin the exact ProseMirror target for these handler-level regressions.
  // columnDrop.browser.test.ts separately exercises real browser hit-testing.
  const coords = vi.spyOn(view, "posAtCoords").mockReturnValue({
    pos: column.posBeforeNode,
    inside: column.posBeforeNode,
    affinity: 0,
  });
  const rect = vi
    .spyOn(
      view.nodeDOM(column.posBeforeNode) as HTMLElement,
      "getBoundingClientRect",
    )
    .mockReturnValue(new DOMRect(0, 0, 100, 20));
  try {
    return plugin.props.handleDrop!.call(
      plugin,
      view,
      Object.assign(
        new MouseEvent("drop", { clientX: position === "left" ? 0 : 100 }),
        { dataTransfer: null },
      ),
      new Slice(Fragment.from(nodes), 0, 0),
      true,
    );
  } finally {
    coords.mockRestore();
    rect.mockRestore();
  }
}

describe("column edge drops", () => {
  it.for(["column-0", "paragraph-1"])(
    "places the cursor in the final nested child when dropping beside %s",
    async (target, { setupEditor }) => {
      const { editor } = await setupEditor({
        mountType: "dom",
        ...multiColumnTestOptions,
      });
      expect(dropOnEdge(editor, ["paragraph-0"], target, "right")).toBe(true);
      expect(editor.getTextCursorPosition().block.id).toBe(
        "nested-paragraph-0",
      );
      editor.insertInlineContent("!");
      expect(editor.getBlock("nested-paragraph-0")?.content).toMatchObject([
        { type: "text", text: "Nested Paragraph 0!" },
      ]);
    },
  );

  it.for(["column-0", "paragraph-0"])(
    "undoes immediate typing separately from the drop beside %s",
    async (target, { setupEditor }) => {
      const { editor } = await setupEditor({
        mountType: "dom",
        ...multiColumnTestOptions,
      });
      editor.transact((tr) => closeHistory(tr));
      const before = editor.document;
      expect(dropOnEdge(editor, ["paragraph-1"], target, "right")).toBe(true);
      const dropped = editor.document;
      expect(dropped).not.toEqual(before);
      editor.insertInlineContent("typed");
      expect(editor.undo()).toBe(true);
      expect(editor.document).toEqual(dropped);
      expect(editor.undo()).toBe(true);
      expect(editor.document).toEqual(before);
    },
  );

  it.for(["left", "right"] as const)(
    "moves a mixed selection to an emptied target's %s edge",
    async (edge, { setupEditor }) => {
      const { editor } = await setupEditor({
        mountType: "dom",
        ...multiColumnTestOptions,
      });
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
      expect(dropOnEdge(editor, dragged, "column-1", edge)).toBe(true);
      expect(
        editor
          .getBlock("column-list-0")!
          .children.map((column) => column.children.map((block) => block.id)),
      ).toEqual([["column-paragraph-0"], dragged, ["last"]]);
    },
  );

  it("preserves the column when dropping only its own children", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      mountType: "dom",
      ...multiColumnTestOptions,
    });
    const before = editor.document;
    expect(
      dropOnEdge(
        editor,
        ["column-paragraph-0", "column-paragraph-1"],
        "column-0",
        "right",
      ),
    ).toBe(true);
    expect(editor.document).toEqual(before);
  });

  it("unwraps the layout when all its blocks are dropped together", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      mountType: "dom",
      ...multiColumnTestOptions,
    });
    const dragged = [
      "column-paragraph-0",
      "column-paragraph-1",
      "column-paragraph-2",
      "column-paragraph-3",
    ];
    expect(dropOnEdge(editor, dragged, "column-0", "left")).toBe(true);
    expect(editor.getBlock("column-list-0")).toBeUndefined();
    expect(editor.document.map((block) => block.id)).toEqual([
      "paragraph-0",
      "paragraph-1",
      ...dragged,
      "paragraph-2",
    ]);
  });
});

// Dropping blocks onto themselves does nothing, like dropping a block next to
// itself. Removing the dragged blocks from where they are used to remove the
// drop target with them, and the handler then threw when it updated the
// target (`Block with ID ... not found`).
describe("drops whose target the dragged blocks hold", () => {
  it("does nothing when the dragged blocks hold the target's column list", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      mountType: "dom",
      ...multiColumnTestOptions,
    });
    const before = editor.document;
    // A block selection that spans the paragraph above the column list and
    // the whole list (e.g. extended with Shift+Arrow from the paragraph into
    // a column), dragged by one of the list's blocks.
    expect(
      dropOnEdge(editor, ["paragraph-1", "column-list-0"], "column-0", "right"),
    ).toBe(true);
    expect(editor.document).toEqual(before);
  });

  it("does nothing when a dragged block holds the target", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      mountType: "dom",
      ...multiColumnTestOptions,
    });
    const before = editor.document;
    expect(
      dropOnEdge(editor, ["paragraph-0"], "nested-paragraph-0", "left"),
    ).toBe(true);
    expect(editor.document).toEqual(before);
  });
});
