import { beforeAll, describe, expect, it } from "vite-plus/test";

import { en } from "../../i18n/locales/index.js";
import { setupTestEnv } from "../../test/setupTestEnv.js";
import {
  getMultiColumnSlashMenuItems,
  insertColumnList,
} from "./getMultiColumnSlashMenuItems.js";

const getEditor = setupTestEnv();

beforeAll(() => {
  // The slash menu items read their labels from the multi-column dictionary,
  // which isn't included in the base test editor's dictionary.
  (getEditor().dictionary as any).multi_column = en;
});

describe("Test getMultiColumnSlashMenuItems", () => {
  it("Returns two & three column items", () => {
    const items = getMultiColumnSlashMenuItems(getEditor());

    expect(items.length).toBe(2);
    expect(items.map((item) => item.title)).toStrictEqual([
      "Two Columns",
      "Three Columns",
    ]);
  });

  describe("Text cursor not in a column", () => {
    it("Inserts two columns below current block", () => {
      getEditor().setTextCursorPosition("paragraph-1");

      insertColumnList(getEditor(), 2);

      expect(getEditor().document).toMatchSnapshot();
    });

    it("Inserts three columns below current block", () => {
      getEditor().setTextCursorPosition("paragraph-1");

      insertColumnList(getEditor(), 3);

      expect(getEditor().document).toMatchSnapshot();
    });

    it("Replaces current block when empty", () => {
      getEditor().insertBlocks(
        [{ id: "empty-paragraph", type: "paragraph" }],
        "paragraph-1",
        "after",
      );
      getEditor().setTextCursorPosition("empty-paragraph");

      insertColumnList(getEditor(), 2);

      // The empty paragraph should have been replaced by the column list, so it
      // should no longer be in the document.
      expect(getEditor().getBlock("empty-paragraph")).toBeUndefined();
      expect(getEditor().document).toMatchSnapshot();
    });
  });

  describe("Text cursor in a column", () => {
    it("Does not throw", () => {
      getEditor().setTextCursorPosition("column-paragraph-0");

      expect(() => insertColumnList(getEditor(), 2)).not.toThrow();
    });

    it("Inserts two columns below the column list, not nested", () => {
      getEditor().setTextCursorPosition("column-paragraph-0");

      insertColumnList(getEditor(), 2);

      // The new column list should be a top-level sibling inserted right after
      // the existing column list, rather than nested inside a column.
      const topLevelTypes = getEditor().document.map((block) => block.type);
      const columnListIndex = topLevelTypes.indexOf("columnList");
      expect(topLevelTypes[columnListIndex + 1]).toBe("columnList");

      // The original column list should still contain exactly its two columns.
      expect(getEditor().getBlock("column-list-0")!.children.length).toBe(2);

      expect(getEditor().document).toMatchSnapshot();
    });

    it("Inserts three columns below the column list, not nested", () => {
      getEditor().setTextCursorPosition("column-paragraph-0");

      insertColumnList(getEditor(), 3);

      expect(getEditor().document).toMatchSnapshot();
    });

    it("Places the text cursor in the new column list", () => {
      getEditor().setTextCursorPosition("column-paragraph-0");

      insertColumnList(getEditor(), 2);

      // The cursor should be in a paragraph nested in the newly inserted
      // top-level column list, not in the original one.
      const cursorBlock = getEditor().getTextCursorPosition().block;
      const column = getEditor().getParentBlock(cursorBlock);
      const columnList = getEditor().getParentBlock(column!);

      expect(cursorBlock.type).toBe("paragraph");
      expect(column!.type).toBe("column");
      expect(columnList!.type).toBe("columnList");
      expect(columnList!.id).not.toBe("column-list-0");
      // The new column list is top-level, so it has no parent.
      expect(getEditor().getParentBlock(columnList!)).toBeUndefined();
    });
  });
});
