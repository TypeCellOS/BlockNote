import { BlockNoteEditor } from "@blocknote/core";
import { beforeEach, describe, expect, it } from "vitest";
import {
  InsertBlocksOperation,
  RemoveBlocksOperation,
  UpdateBlocksOperation,
} from "../../functions/blocknoteFunctions.js";
import { applyOperations } from "./applyOperations.js";

describe("applyOperations", () => {
  let editor: BlockNoteEditor;

  beforeEach(() => {
    editor = BlockNoteEditor.create({
      initialContent: [
        {
          id: "ref1",
          content: "Hello, world!",
        },
      ],
    });
  });

  it("should apply insert operations to the editor", async () => {
    const insertOp = {
      operation: {
        type: "insert",
        blocks: [{ content: "block1" }],
        referenceId: "ref1",
        position: "after",
      } as InsertBlocksOperation,
    };

    async function* mockStream() {
      yield insertOp;
    }

    const result = [];
    for await (const chunk of applyOperations(editor, mockStream())) {
      result.push(chunk);
    }

    // Should call insertBlocks with the right parameters
    expect(editor.document[1]).toMatchObject({
      content: [{ text: "block1" }],
    });

    // Should yield the operation with result: "ok"
    expect(result.length).toBe(1);
    expect(result[0]).toEqual({
      lastBlockId: "0",
      operation: insertOp.operation,
      result: "ok",
    });
  });

  it("should apply update operations to the editor", async () => {
    const updateOp = {
      operation: {
        type: "update",
        id: "ref1",
        block: { content: "Hello, updated content" },
      } as UpdateBlocksOperation,
    };

    async function* mockStream() {
      yield updateOp;
    }

    const result = [];
    for await (const chunk of applyOperations(editor, mockStream())) {
      result.push(chunk);
    }

    // Should call updateBlock with the right parameters
    expect(editor.document[0]).toMatchObject({
      content: [{ text: "updated content" }],
    });

    // Should yield the operation with result: "ok"
    expect(result.length).toBe(1);
    expect(result[0]).toEqual({
      lastBlockId: "ref1",
      operation: updateOp.operation,
      result: "ok",
    });
  });

  it("should apply remove operations to the editor", async () => {
    const removeOp = {
      operation: {
        type: "remove",
        ids: ["ref1"],
      } as RemoveBlocksOperation,
    };

    async function* mockStream() {
      yield removeOp;
    }

    const result = [];
    for await (const chunk of applyOperations(editor, mockStream())) {
      result.push(chunk);
    }

    // Should call removeBlocks with the right parameters
    expect(editor.document.length).toBe(1);

    expect(editor.document[0].content).toEqual([]);

    // Should yield the operation with result: "ok"
    expect(result.length).toBe(1);
    expect(result[0]).toEqual({
      lastBlockId: "0",
      operation: removeOp.operation,
      result: "ok",
    });
  });

  it("should handle multiple operations in sequence", async () => {
    const insertOp = {
      operation: {
        type: "insert",
        blocks: [{ content: "block1" }],
        referenceId: "ref1",
        position: "after",
      } as InsertBlocksOperation,
    };

    const updateOp = {
      operation: {
        type: "update",
        id: "ref1",
        block: { content: "updated content" },
      } as UpdateBlocksOperation,
    };

    async function* mockStream() {
      yield insertOp;
      yield updateOp;
    }

    const result = [];
    for await (const chunk of applyOperations(editor, mockStream())) {
      result.push(chunk);
    }

    // Should call all the editor methods with the right parameters
    expect(editor.document[1]).toMatchObject({
      content: [{ text: "block1" }],
    });

    expect(editor.document[0]).toMatchObject({
      content: [{ text: "updated content" }],
    });

    expect(editor.document.length).toBe(2);
  });
});
