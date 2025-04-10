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

  it("should return blocks inserted by a transaction", async () => {
    editor.insertBlocks([{ type: "paragraph" }], "paragraph-0", "after");

    const blocksChanged = getBlocksChangedByTransaction(transaction!, editor);

    await expect(blocksChanged).toMatchFileSnapshot("blocks-inserted.json");
  });

  it("should return nested blocks inserted by a transaction", async () => {
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

    await expect(blocksChanged).toMatchFileSnapshot(
      "blocks-inserted-nested.json"
    );
  });

  it("should return blocks deleted by a transaction", async () => {
    editor.removeBlocks(["paragraph-0"]);

    const blocksChanged = getBlocksChangedByTransaction(transaction!, editor);

    await expect(blocksChanged).toMatchFileSnapshot("blocks-deleted.json");
  });

  it("should return nested blocks deleted by a transaction", async () => {
    editor.removeBlocks(["nested-paragraph-0"]);

    const blocksChanged = getBlocksChangedByTransaction(transaction!, editor);

    await expect(blocksChanged).toMatchFileSnapshot(
      "blocks-deleted-nested.json"
    );
  });

  it("should return blocks updated by a transaction", async () => {
    editor.updateBlock("paragraph-0", {
      props: {
        backgroundColor: "red",
      },
    });

    const blocksChanged = getBlocksChangedByTransaction(transaction!, editor);

    await expect(blocksChanged).toMatchFileSnapshot("blocks-updated.json");
  });

  it("should return nested blocks updated by a transaction", async () => {
    editor.updateBlock("nested-paragraph-0", {
      props: {
        backgroundColor: "red",
      },
    });

    const blocksChanged = getBlocksChangedByTransaction(transaction!, editor);

    await expect(blocksChanged).toMatchFileSnapshot(
      "blocks-updated-nested.json"
    );
  });

  it("should return deeply nested blocks updated by a transaction", async () => {
    editor.updateBlock("double-nested-paragraph-0", {
      content: "Example Text",
    });

    const blocksChanged = getBlocksChangedByTransaction(transaction!, editor);

    await expect(blocksChanged).toMatchFileSnapshot(
      "blocks-updated-nested-deep.json"
    );
  });

  it("should return multiple nested blocks updated by a transaction", async () => {
    editor.updateBlock("nested-paragraph-0", {
      props: {
        backgroundColor: "red",
      },
    });
    editor.updateBlock("double-nested-paragraph-0", {
      content: "Example Text",
    });

    const blocksChanged = getBlocksChangedByTransaction(transaction!, editor);

    await expect(blocksChanged).toMatchFileSnapshot(
      "blocks-updated-nested-multiple.json"
    );
  });

  it("should only return a single block, if multiple updates change a single block in a transaction", async () => {
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

    await expect(blocksChanged).toMatchFileSnapshot(
      "blocks-updated-single.json"
    );
  });

  it("should return multiple blocks, if multiple updates change multiple blocks in a transaction", async () => {
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

    await expect(blocksChanged).toMatchFileSnapshot(
      "blocks-updated-multiple.json"
    );
  });

  it("should return multiple blocks, if multiple inserts add new blocks in a transaction", async () => {
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

    await expect(blocksChanged).toMatchFileSnapshot(
      "blocks-updated-multiple-insert.json"
    );
  });
});
