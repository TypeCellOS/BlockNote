import { en as coreDictionary } from "@blocknote/core/locales";
import { describe, expect } from "vite-plus/test";

import { en } from "../../i18n/locales/index.js";
import { multiColumnTestOptions } from "../../test/setupTestEnv.js";
import {
  getMultiColumnSlashMenuItems,
  insertColumnList,
} from "./getMultiColumnSlashMenuItems.js";

const options = {
  ...multiColumnTestOptions,
  dictionary: { ...coreDictionary, multi_column: en },
};

describe("Test getMultiColumnSlashMenuItems", () => {
  it("Returns two & three column items", async ({ setupEditor }) => {
    const { editor } = await setupEditor(options);
    const items = getMultiColumnSlashMenuItems(editor);

    expect(items.length).toBe(2);
    expect(items.map((item) => item.title)).toStrictEqual([
      "Two Columns",
      "Three Columns",
    ]);
  });

  describe("Text cursor not in a column", () => {
    it("Inserts two columns below current block", async ({ setupEditor }) => {
      const { editor } = await setupEditor(options);
      editor.setTextCursorPosition("paragraph-1");

      insertColumnList(editor, 2);

      expect(editor.document).toMatchSnapshot();
    });

    it("Inserts three columns below current block", async ({ setupEditor }) => {
      const { editor } = await setupEditor(options);
      editor.setTextCursorPosition("paragraph-1");

      insertColumnList(editor, 3);

      expect(editor.document).toMatchSnapshot();
    });

    it("Replaces current block when empty", async ({ setupEditor }) => {
      const { editor } = await setupEditor(options);
      editor.insertBlocks(
        [{ id: "empty-paragraph", type: "paragraph" }],
        "paragraph-1",
        "after",
      );
      editor.setTextCursorPosition("empty-paragraph");

      insertColumnList(editor, 2);

      // The empty paragraph becomes the column list, and keeps its id.
      expect(editor.getBlock("empty-paragraph")?.type).toBe("columnList");
      const cursorBlock = editor.getTextCursorPosition().block;
      const column = editor.getParentBlock(cursorBlock);
      expect(cursorBlock.type).toBe("paragraph");
      expect(column?.type).toBe("column");
      expect(editor.getParentBlock(column!)?.id).toBe("empty-paragraph");
      expect(editor.document).toMatchSnapshot();
    });
  });

  describe("Text cursor in a column", () => {
    it("Does not throw", async ({ setupEditor }) => {
      const { editor } = await setupEditor(options);
      editor.setTextCursorPosition("column-paragraph-0");

      expect(() => insertColumnList(editor, 2)).not.toThrow();
    });

    it("Inserts two columns below the column list, not nested", async ({
      setupEditor,
    }) => {
      const { editor } = await setupEditor(options);
      editor.setTextCursorPosition("column-paragraph-0");

      insertColumnList(editor, 2);

      // The new column list should be a top-level sibling inserted right after
      // the existing column list, rather than nested inside a column.
      const topLevelTypes = editor.document.map((block) => block.type);
      const columnListIndex = topLevelTypes.indexOf("columnList");
      expect(topLevelTypes[columnListIndex + 1]).toBe("columnList");

      // The original column list should still contain exactly its two columns.
      expect(editor.getBlock("column-list-0")!.children.length).toBe(2);

      expect(editor.document).toMatchSnapshot();
    });

    it("Inserts three columns below the column list, not nested", async ({
      setupEditor,
    }) => {
      const { editor } = await setupEditor(options);
      editor.setTextCursorPosition("column-paragraph-0");

      insertColumnList(editor, 3);

      expect(editor.document).toMatchSnapshot();
    });

    it("Places the text cursor in the new column list", async ({
      setupEditor,
    }) => {
      const { editor } = await setupEditor(options);
      editor.setTextCursorPosition("column-paragraph-0");

      insertColumnList(editor, 2);

      // The cursor should be in a paragraph nested in the newly inserted
      // top-level column list, not in the original one.
      const cursorBlock = editor.getTextCursorPosition().block;
      const column = editor.getParentBlock(cursorBlock);
      const columnList = editor.getParentBlock(column!);

      expect(cursorBlock.type).toBe("paragraph");
      expect(column!.type).toBe("column");
      expect(columnList!.type).toBe("columnList");
      expect(columnList!.id).not.toBe("column-list-0");
      // The new column list is top-level, so it has no parent.
      expect(editor.getParentBlock(columnList!)).toBeUndefined();
    });
  });
});
