import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  InsertBlocksOperation,
  RemoveBlocksOperation,
  UpdateBlocksOperation,
} from "../../functions/blocknoteFunctions.js";
import { applyOperations } from "./applyOperations.js";

describe("applyOperations", () => {
  // Mock BlockNoteEditor
  const mockEditor = {
    insertBlocks: vi.fn(),
    updateBlock: vi.fn(),
    removeBlocks: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
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
    for await (const chunk of applyOperations(
      mockEditor as any,
      mockStream()
    )) {
      result.push(chunk);
    }

    // Should call insertBlocks with the right parameters
    expect(mockEditor.insertBlocks).toHaveBeenCalledWith(
      insertOp.operation.blocks,
      insertOp.operation.referenceId,
      insertOp.operation.position
    );

    // Should yield the operation with result: "ok"
    expect(result.length).toBe(1);
    expect(result[0]).toEqual({
      operation: insertOp.operation,
      result: "ok",
    });
  });

  it("should apply update operations to the editor", async () => {
    const updateOp = {
      operation: {
        type: "update",
        id: "block1",
        block: { content: "updated content" },
      } as UpdateBlocksOperation,
    };

    async function* mockStream() {
      yield updateOp;
    }

    const result = [];
    for await (const chunk of applyOperations(
      mockEditor as any,
      mockStream()
    )) {
      result.push(chunk);
    }

    // Should call updateBlock with the right parameters
    expect(mockEditor.updateBlock).toHaveBeenCalledWith(
      updateOp.operation.id,
      updateOp.operation.block
    );

    // Should yield the operation with result: "ok"
    expect(result.length).toBe(1);
    expect(result[0]).toEqual({
      operation: updateOp.operation,
      result: "ok",
    });
  });

  it("should apply remove operations to the editor", async () => {
    const removeOp = {
      operation: {
        type: "remove",
        ids: ["block1", "block2"],
      } as RemoveBlocksOperation,
    };

    async function* mockStream() {
      yield removeOp;
    }

    const result = [];
    for await (const chunk of applyOperations(
      mockEditor as any,
      mockStream()
    )) {
      result.push(chunk);
    }

    // Should call removeBlocks with the right parameters
    expect(mockEditor.removeBlocks).toHaveBeenCalledWith(
      removeOp.operation.ids
    );

    // Should yield the operation with result: "ok"
    expect(result.length).toBe(1);
    expect(result[0]).toEqual({
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
        id: "block1",
        block: { content: "updated content" },
      } as UpdateBlocksOperation,
    };

    const removeOp = {
      operation: {
        type: "remove",
        ids: ["block1", "block2"],
      } as RemoveBlocksOperation,
    };

    async function* mockStream() {
      yield insertOp;
      yield updateOp;
      yield removeOp;
    }

    const result = [];
    for await (const chunk of applyOperations(
      mockEditor as any,
      mockStream()
    )) {
      result.push(chunk);
    }

    // Should call all the editor methods with the right parameters
    expect(mockEditor.insertBlocks).toHaveBeenCalledWith(
      insertOp.operation.blocks,
      insertOp.operation.referenceId,
      insertOp.operation.position
    );

    expect(mockEditor.updateBlock).toHaveBeenCalledWith(
      updateOp.operation.id,
      updateOp.operation.block
    );

    expect(mockEditor.removeBlocks).toHaveBeenCalledWith(
      removeOp.operation.ids
    );

    // Should yield all operations with result: "ok"
    expect(result.length).toBe(3);
    expect(result[0]).toEqual({
      operation: insertOp.operation,
      result: "ok",
    });
    expect(result[1]).toEqual({
      operation: updateOp.operation,
      result: "ok",
    });
    expect(result[2]).toEqual({
      operation: removeOp.operation,
      result: "ok",
    });
  });
});
