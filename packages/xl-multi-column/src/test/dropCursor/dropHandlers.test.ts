import { beforeEach, describe, expect, it } from "vite-plus/test";

import {
  dropOntoBlock,
  dropOntoColumn,
} from "../../extensions/DropCursor/dropHandlers.js";
import { setupTestEnv } from "../setupTestEnv.js";

const getEditor = setupTestEnv();

describe("dropOntoColumn", () => {
  describe("2-column layout, source column emptied by the drag (crash regression)", () => {
    beforeEach(() => {
      getEditor().replaceBlocks(getEditor().document, [
        {
          id: "column-list-solo",
          type: "columnList",
          children: [
            {
              id: "column-solo",
              type: "column",
              children: [{ id: "solo", type: "paragraph", content: "Solo" }],
            },
            {
              id: "column-sibling",
              type: "column",
              children: [
                { id: "sibling", type: "paragraph", content: "Sibling" },
              ],
            },
          ],
        },
      ]);
    });

    it("does not throw when dropped on the left edge of the sibling column", () => {
      const columnList = getEditor().getBlock("column-list-solo")!;
      const draggedBlock = getEditor().getBlock("solo")!;

      expect(() =>
        dropOntoColumn(getEditor(), {
          columnList,
          targetColumnId: "column-sibling",
          draggedBlock,
          position: "left",
        }),
      ).not.toThrow();

      expect(getEditor().document).toMatchSnapshot();
    });

    it("does not throw when dropped on the right edge of the sibling column", () => {
      const columnList = getEditor().getBlock("column-list-solo")!;
      const draggedBlock = getEditor().getBlock("solo")!;

      expect(() =>
        dropOntoColumn(getEditor(), {
          columnList,
          targetColumnId: "column-sibling",
          draggedBlock,
          position: "right",
        }),
      ).not.toThrow();

      expect(getEditor().document).toMatchSnapshot();
    });
  });

  describe("2-column layout, source column keeps other blocks (baseline)", () => {
    beforeEach(() => {
      getEditor().replaceBlocks(getEditor().document, [
        {
          id: "column-list-baseline",
          type: "columnList",
          children: [
            {
              id: "column-source",
              type: "column",
              children: [
                { id: "dragged", type: "paragraph", content: "Dragged" },
                { id: "stays", type: "paragraph", content: "Stays" },
              ],
            },
            {
              id: "column-target",
              type: "column",
              children: [
                { id: "target", type: "paragraph", content: "Target" },
              ],
            },
          ],
        },
      ]);
    });

    it("moves the dragged block without disturbing its sibling", () => {
      const columnList = getEditor().getBlock("column-list-baseline")!;
      const draggedBlock = getEditor().getBlock("dragged")!;

      expect(() =>
        dropOntoColumn(getEditor(), {
          columnList,
          targetColumnId: "column-target",
          draggedBlock,
          position: "left",
        }),
      ).not.toThrow();

      expect(getEditor().document).toMatchSnapshot();
    });
  });

  describe("3-column layout, stale splice index", () => {
    beforeEach(() => {
      getEditor().replaceBlocks(getEditor().document, [
        {
          id: "column-list-three",
          type: "columnList",
          children: [
            {
              id: "column-a",
              type: "column",
              children: [{ id: "a-solo", type: "paragraph", content: "A" }],
            },
            {
              id: "column-b",
              type: "column",
              children: [{ id: "b", type: "paragraph", content: "B" }],
            },
            {
              id: "column-c",
              type: "column",
              children: [{ id: "c", type: "paragraph", content: "C" }],
            },
          ],
        },
      ]);
    });

    it("inserts the new column immediately before the target after the source column is dropped", () => {
      const columnList = getEditor().getBlock("column-list-three")!;
      const draggedBlock = getEditor().getBlock("a-solo")!;

      dropOntoColumn(getEditor(), {
        columnList,
        targetColumnId: "column-c",
        draggedBlock,
        position: "left",
      });

      const updated = getEditor().getBlock("column-list-three")!;
      expect(updated.children.map((c) => c.id)).toEqual([
        "column-b",
        expect.any(String),
        "column-c",
      ]);
    });
  });
});

describe("dropOntoBlock", () => {
  it("wraps the dragged block and target block in a new columnList", () => {
    getEditor().setTextCursorPosition("paragraph-1");

    const targetBlock = getEditor().getBlock("paragraph-1")!;
    const draggedBlock = getEditor().getBlock("paragraph-2")!;

    expect(() =>
      dropOntoBlock(getEditor(), {
        targetBlock,
        draggedBlock,
        position: "left",
      }),
    ).not.toThrow();

    expect(getEditor().document).toMatchSnapshot();
  });
});
