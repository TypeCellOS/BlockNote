import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { setupTestEnv } from "./blockManipulation/setupTestEnv.js";
import { getBlocksChangedByTransaction } from "./nodeUtil.js";
import { Transaction } from "prosemirror-state";
import { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { Step } from "prosemirror-transform";

const getEditor = setupTestEnv();

describe("Test getBlocksChangedByTransaction", () => {
  let transaction: Transaction;
  let editor: BlockNoteEditor;
  let originalDispatch: typeof editor.dispatch;

  beforeEach(() => {
    transaction = undefined as unknown as Transaction;
    editor = getEditor();
    originalDispatch = editor.dispatch;
    const mockDispatch = vi.fn((tr) => {
      editor._tiptapEditor.dispatch(tr);
      if (transaction) {
        tr.steps.forEach((step: Step) => {
          transaction.step(step);
        });
      } else {
        transaction = tr;
      }
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

  it("should return nested blocks inserted by a transaction", () => {
    editor.insertBlocks(
      [
        {
          type: "paragraph",
          children: [{ type: "paragraph", content: "Nested" }],
        },
      ],
      "paragraph-0",
      "after"
    );

    const blocksChanged = getBlocksChangedByTransaction(transaction!, editor);

    expect(blocksChanged).toEqual([
      {
        block: {
          children: [
            {
              children: [],
              content: [
                {
                  styles: {},
                  text: "Nested",
                  type: "text",
                },
              ],
              id: "1",
              props: {
                backgroundColor: "default",
                textAlignment: "left",
                textColor: "default",
              },
              type: "paragraph",
            },
          ],
          props: {
            backgroundColor: "default",
            textAlignment: "left",
            textColor: "default",
          },
          type: "paragraph",
          id: "0",
          content: [],
        },
        prevBlock: undefined,
        source: { type: "local" },
        type: "insert",
      },
      {
        block: {
          children: [],
          content: [
            {
              styles: {},
              text: "Nested",
              type: "text",
            },
          ],
          id: "1",
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

  it("should return nested blocks deleted by a transaction", () => {
    editor.removeBlocks(["nested-paragraph-0"]);

    const blocksChanged = getBlocksChangedByTransaction(transaction!, editor);

    expect(blocksChanged).toEqual([
      {
        block: {
          children: [
            {
              children: [],
              content: [
                {
                  styles: {},
                  text: "Double Nested Paragraph 0",
                  type: "text",
                },
              ],
              id: "double-nested-paragraph-0",
              props: {
                backgroundColor: "default",
                textAlignment: "left",
                textColor: "default",
              },
              type: "paragraph",
            },
          ],
          content: [
            {
              styles: {},
              text: "Nested Paragraph 0",
              type: "text",
            },
          ],
          id: "nested-paragraph-0",
          props: {
            backgroundColor: "default",
            textAlignment: "left",
            textColor: "default",
          },
          type: "paragraph",
        },
        prevBlock: undefined,
        source: {
          type: "local",
        },
        type: "delete",
      },
      {
        block: {
          children: [],
          content: [
            {
              styles: {},
              text: "Double Nested Paragraph 0",
              type: "text",
            },
          ],
          id: "double-nested-paragraph-0",
          props: {
            backgroundColor: "default",
            textAlignment: "left",
            textColor: "default",
          },
          type: "paragraph",
        },
        prevBlock: undefined,
        source: {
          type: "local",
        },
        type: "delete",
      },
      {
        block: {
          children: [],
          content: [
            {
              styles: {},
              text: "Paragraph with children",
              type: "text",
            },
          ],
          id: "paragraph-with-children",
          props: {
            backgroundColor: "default",
            textAlignment: "left",
            textColor: "default",
          },
          type: "paragraph",
        },
        prevBlock: {
          children: [
            {
              children: [
                {
                  children: [],
                  content: [
                    {
                      styles: {},
                      text: "Double Nested Paragraph 0",
                      type: "text",
                    },
                  ],
                  id: "double-nested-paragraph-0",
                  props: {
                    backgroundColor: "default",
                    textAlignment: "left",
                    textColor: "default",
                  },
                  type: "paragraph",
                },
              ],
              content: [
                {
                  styles: {},
                  text: "Nested Paragraph 0",
                  type: "text",
                },
              ],
              id: "nested-paragraph-0",
              props: {
                backgroundColor: "default",
                textAlignment: "left",
                textColor: "default",
              },
              type: "paragraph",
            },
          ],
          content: [
            {
              styles: {},
              text: "Paragraph with children",
              type: "text",
            },
          ],
          id: "paragraph-with-children",
          props: {
            backgroundColor: "default",
            textAlignment: "left",
            textColor: "default",
          },
          type: "paragraph",
        },
        source: {
          type: "local",
        },
        type: "update",
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

  it("should return nested blocks updated by a transaction", () => {
    editor.updateBlock("nested-paragraph-0", {
      props: {
        backgroundColor: "red",
      },
    });

    const blocksChanged = getBlocksChangedByTransaction(transaction!, editor);

    expect(blocksChanged).toEqual([
      {
        block: {
          children: [
            {
              children: [
                {
                  children: [],
                  content: [
                    {
                      styles: {},
                      text: "Double Nested Paragraph 0",
                      type: "text",
                    },
                  ],
                  id: "double-nested-paragraph-0",
                  props: {
                    backgroundColor: "default",
                    textAlignment: "left",
                    textColor: "default",
                  },
                  type: "paragraph",
                },
              ],
              content: [
                {
                  styles: {},
                  text: "Nested Paragraph 0",
                  type: "text",
                },
              ],
              id: "nested-paragraph-0",
              props: {
                backgroundColor: "red",
                textAlignment: "left",
                textColor: "default",
              },
              type: "paragraph",
            },
          ],
          content: [
            {
              styles: {},
              text: "Paragraph with children",
              type: "text",
            },
          ],
          id: "paragraph-with-children",
          props: {
            backgroundColor: "default",
            textAlignment: "left",
            textColor: "default",
          },
          type: "paragraph",
        },
        prevBlock: {
          children: [
            {
              children: [
                {
                  children: [],
                  content: [
                    {
                      styles: {},
                      text: "Double Nested Paragraph 0",
                      type: "text",
                    },
                  ],
                  id: "double-nested-paragraph-0",
                  props: {
                    backgroundColor: "default",
                    textAlignment: "left",
                    textColor: "default",
                  },
                  type: "paragraph",
                },
              ],
              content: [
                {
                  styles: {},
                  text: "Nested Paragraph 0",
                  type: "text",
                },
              ],
              id: "nested-paragraph-0",
              props: {
                backgroundColor: "default",
                textAlignment: "left",
                textColor: "default",
              },
              type: "paragraph",
            },
          ],
          content: [
            {
              styles: {},
              text: "Paragraph with children",
              type: "text",
            },
          ],
          id: "paragraph-with-children",
          props: {
            backgroundColor: "default",
            textAlignment: "left",
            textColor: "default",
          },
          type: "paragraph",
        },
        source: {
          type: "local",
        },
        type: "update",
      },
      {
        block: {
          children: [
            {
              children: [],
              content: [
                {
                  styles: {},
                  text: "Double Nested Paragraph 0",
                  type: "text",
                },
              ],
              id: "double-nested-paragraph-0",
              props: {
                backgroundColor: "default",
                textAlignment: "left",
                textColor: "default",
              },
              type: "paragraph",
            },
          ],
          content: [
            {
              styles: {},
              text: "Nested Paragraph 0",
              type: "text",
            },
          ],
          id: "nested-paragraph-0",
          props: {
            backgroundColor: "red",
            textAlignment: "left",
            textColor: "default",
          },
          type: "paragraph",
        },
        prevBlock: {
          children: [
            {
              children: [],
              content: [
                {
                  styles: {},
                  text: "Double Nested Paragraph 0",
                  type: "text",
                },
              ],
              id: "double-nested-paragraph-0",
              props: {
                backgroundColor: "default",
                textAlignment: "left",
                textColor: "default",
              },
              type: "paragraph",
            },
          ],
          content: [
            {
              styles: {},
              text: "Nested Paragraph 0",
              type: "text",
            },
          ],
          id: "nested-paragraph-0",
          props: {
            backgroundColor: "default",
            textAlignment: "left",
            textColor: "default",
          },
          type: "paragraph",
        },
        source: {
          type: "local",
        },
        type: "update",
      },
    ]);
  });

  it("should only return a single block, if multiple updates change a single block in a transaction", () => {
    editor.updateBlock("paragraph-0", {
      props: {
        backgroundColor: "red",
      },
    });
    editor.updateBlock("paragraph-0", {
      props: {
        backgroundColor: "blue",
      },
    });

    const blocksChanged = getBlocksChangedByTransaction(transaction!, editor);

    expect(blocksChanged).toEqual([
      {
        block: {
          children: [],
          id: "paragraph-0",
          props: {
            backgroundColor: "blue",
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

  it("should return multiple blocks, if multiple updates change multiple blocks in a transaction", () => {
    editor.updateBlock("paragraph-0", {
      props: {
        backgroundColor: "red",
      },
    });
    editor.updateBlock("paragraph-1", {
      props: {
        backgroundColor: "blue",
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
      {
        block: {
          children: [],
          id: "paragraph-1",
          props: {
            backgroundColor: "blue",
            textAlignment: "left",
            textColor: "default",
          },
          type: "paragraph",
          content: [
            {
              styles: {},
              text: "Paragraph 1",
              type: "text",
            },
          ],
        },
        prevBlock: {
          children: [],
          id: "paragraph-1",
          props: {
            backgroundColor: "default",
            textAlignment: "left",
            textColor: "default",
          },
          type: "paragraph",
          content: [
            {
              styles: {},
              text: "Paragraph 1",
              type: "text",
            },
          ],
        },
        source: { type: "local" },
        type: "update",
      },
    ]);
  });

  it("should return multiple blocks, if multiple inserts add new blocks in a transaction", () => {
    editor.insertBlocks(
      [{ type: "paragraph", content: "ABC" }],
      "paragraph-0",
      "after"
    );
    editor.insertBlocks(
      [{ type: "paragraph", content: "DEF" }],
      "paragraph-1",
      "after"
    );

    const blocksChanged = getBlocksChangedByTransaction(transaction!, editor);

    expect(blocksChanged).toEqual([
      {
        block: {
          children: [],
          content: [
            {
              styles: {},
              text: "ABC",
              type: "text",
            },
          ],
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
      {
        block: {
          children: [],
          content: [
            {
              styles: {},
              text: "DEF",
              type: "text",
            },
          ],
          id: "1",
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
});
