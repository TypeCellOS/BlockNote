import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { setupTestEnv } from "./blockManipulation/setupTestEnv.js";
import { getBlocksChangedByTransaction } from "./nodeUtil.js";
import { Transaction } from "prosemirror-state";
import { BlockNoteEditor } from "../editor/BlockNoteEditor.js";

const getEditor = setupTestEnv();

describe("Test getBlocksChangedByTransaction", () => {
  let transaction: Transaction;
  let editor: BlockNoteEditor;
  let originalDispatch: typeof editor.dispatch;

  beforeEach(() => {
    editor = getEditor();
    originalDispatch = editor.dispatch;
    const mockDispatch = vi.fn((tr) => {
      transaction = tr;
    });
    editor.dispatch = mockDispatch;
  });

  afterEach(() => {
    editor.dispatch = originalDispatch;
  });

  it("should return the correct blocks changed by a transaction", () => {
    const transaction = editor.transaction;
    const blocksChanged = getBlocksChangedByTransaction(transaction, editor);
    expect(blocksChanged).toEqual([]);
  });

  it("should return blocks inserted by a transaction", () => {
    editor.insertBlocks([{ type: "paragraph" }], "paragraph-0", "after");

    const blocksChanged = getBlocksChangedByTransaction(transaction!, editor);

    expect(blocksChanged).toEqual([
      {
        block: {
          children: [],
          content: [],
          id: "0",
          props: {
            backgroundColor: "default",
            textAlignment: "left",
            textColor: "default",
          },
          type: "paragraph",
        },
        prevBlock: undefined,
        source: { type: "local" },
        type: "insert",
      },
    ]);
  });

  it("should return blocks deleted by a transaction", () => {
    editor.removeBlocks(["paragraph-0"]);

    const blocksChanged = getBlocksChangedByTransaction(transaction!, editor);

    expect(blocksChanged).toEqual([
      {
        block: {
          children: [],
          id: "paragraph-0",
          props: {
            backgroundColor: "default",
            textAlignment: "left",
            textColor: "default",
          },
          type: "paragraph",
          content: [
            {
              styles: {},
              text: "Paragraph 0",
              type: "text",
            },
          ],
        },
        prevBlock: undefined,
        source: { type: "local" },
        type: "delete",
      },
    ]);
  });

  it("should return blocks updated by a transaction", () => {
    editor.updateBlock("paragraph-0", {
      props: {
        backgroundColor: "red",
      },
    });

    const blocksChanged = getBlocksChangedByTransaction(transaction!, editor);

    expect(blocksChanged).toEqual([
      {
        block: {
          children: [],
          id: "paragraph-0",
          props: {
            backgroundColor: "red",
            textAlignment: "left",
            textColor: "default",
          },
          type: "paragraph",
          content: [
            {
              styles: {},
              text: "Paragraph 0",
              type: "text",
            },
          ],
        },
        prevBlock: {
          children: [],
          id: "paragraph-0",
          props: {
            backgroundColor: "default",
            textAlignment: "left",
            textColor: "default",
          },
          type: "paragraph",
          content: [
            {
              styles: {},
              text: "Paragraph 0",
              type: "text",
            },
          ],
        },
        source: { type: "local" },
        type: "update",
      },
    ]);
  });
});
