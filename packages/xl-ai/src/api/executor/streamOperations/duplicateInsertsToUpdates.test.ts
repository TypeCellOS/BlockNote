import { beforeEach, describe, expect, it, vi } from "vitest";
import { BlockNoteOperation } from "../../functions/blocknoteFunctions.js";
import { duplicateInsertsToUpdates } from "./duplicateInsertsToUpdates.js";

// Mock the UniqueID.options.generateID function
vi.mock("@blocknote/core", () => ({
  UniqueID: {
    options: {
      generateID: vi.fn().mockImplementation(() => "mocked-id"),
    },
  },
}));

describe("duplicateInsertsToUpdates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should pass through non-insert operations unchanged", async () => {
    // Create a mock stream with a remove operation
    async function* mockStream() {
      yield {
        operation: {
          type: "remove",
          ids: ["123", "456"],
        } as BlockNoteOperation,
        isUpdateToPreviousOperation: false,
        isPossiblyPartial: false,
      };
    }

    const result = [];
    for await (const chunk of duplicateInsertsToUpdates(mockStream())) {
      result.push(chunk);
    }

    expect(result.length).toBe(1);
    expect(result[0]).toEqual({
      operation: {
        type: "remove",
        ids: ["123", "456"],
      },
      isUpdateToPreviousOperation: false,
      isPossiblyPartial: false,
    });
  });

  it("should convert insert operations to update operations for previously inserted blocks", async () => {
    // First insert operation
    const firstInsert = {
      operation: {
        type: "insert",
        blocks: [{ content: "block1" }],
        referenceId: "ref1",
        position: "after",
      } as BlockNoteOperation,
      isUpdateToPreviousOperation: false,
      isPossiblyPartial: true,
    };

    // Second insert operation (update to the first one)
    const secondInsert = {
      operation: {
        type: "insert",
        blocks: [{ content: "block1-updated" }, { content: "block2" }],
        referenceId: "ref1",
        position: "after",
      } as BlockNoteOperation,
      isUpdateToPreviousOperation: true,
      isPossiblyPartial: true,
    };

    const thirdInsert = {
      operation: {
        type: "insert",
        blocks: [
          { content: "block1-updated" },
          { content: "block2" },
          { content: "block3" },
          { content: "block4" },
        ],
        referenceId: "ref1",
        position: "after",
      } as BlockNoteOperation,
      isUpdateToPreviousOperation: true,
      isPossiblyPartial: true,
    };

    const fourthInsert = {
      operation: {
        type: "insert",
        blocks: [
          { content: "block1-updated" },
          { content: "block2" },
          { content: "block3" },
          { content: "block4" },
          { content: "block5" },
        ],
        referenceId: "ref1",
        position: "after",
      } as BlockNoteOperation,
      isUpdateToPreviousOperation: true,
      isPossiblyPartial: true,
    };

    async function* mockStream() {
      yield firstInsert;
      yield secondInsert;
      yield thirdInsert;
      yield fourthInsert;
    }

    const result = [];
    for await (const chunk of duplicateInsertsToUpdates(mockStream())) {
      result.push(chunk);
    }

    // firstInsert

    // First operationshould be an insert with block1
    expect(result[0]).toEqual({
      ...firstInsert,
      operation: {
        ...firstInsert.operation,
        blocks: [{ content: "block1", id: "mocked-id" }],
      },
    });

    // secondInsert

    // Second operation should be an update for block1
    expect(result[1]).toEqual({
      ...secondInsert,
      operation: {
        type: "update",
        id: "mocked-id",
        block: { content: "block1-updated" },
      },
    });

    // Third operation should be an insert for block2, after block1
    expect(result[2]).toEqual({
      ...secondInsert,
      operation: {
        type: "insert",
        position: "after",
        referenceId: "mocked-id",
        blocks: [{ content: "block2", id: "mocked-id" }],
      },
    });

    // thirdInsert

    // First operation should be an update for block1 (unchanged content)
    expect(result[3]).toEqual({
      ...thirdInsert,
      operation: {
        type: "update",
        id: "mocked-id",
        block: { content: "block1-updated" },
      },
    });

    // Second operation should be an update for block2 (unchanged content)
    expect(result[4]).toEqual({
      ...thirdInsert,
      operation: {
        type: "update",
        id: "mocked-id",
        block: { content: "block2" },
      },
    });

    // Third operation should be an insert for block3 and 4, after block2
    expect(result[5]).toEqual({
      ...thirdInsert,
      operation: {
        type: "insert",
        position: "after",
        referenceId: "mocked-id",
        blocks: [
          { content: "block3", id: "mocked-id" },
          { content: "block4", id: "mocked-id" },
        ],
      },
    });

    // fourthInsert

    // First operation should be an update for block1 (unchanged content)
    expect(result[6]).toEqual({
      ...fourthInsert,
      operation: {
        type: "update",
        id: "mocked-id",
        block: { content: "block1-updated" },
      },
    });

    // Second operation should be an update for block2 (unchanged content)
    expect(result[7]).toEqual({
      ...fourthInsert,
      operation: {
        type: "update",
        id: "mocked-id",
        block: { content: "block2" },
      },
    });

    // Third operation should be an update for block3 (unchanged content)
    expect(result[8]).toEqual({
      ...fourthInsert,
      operation: {
        type: "update",
        id: "mocked-id",
        block: { content: "block3" },
      },
    });

    // Fourth operation should be an update for block4 (unchanged content)
    expect(result[9]).toEqual({
      ...fourthInsert,
      operation: {
        type: "update",
        id: "mocked-id",
        block: { content: "block4" },
      },
    });

    // Fifth operation should be an insert for block5, after block4
    expect(result[10]).toEqual({
      ...fourthInsert,
      operation: {
        type: "insert",
        position: "after",
        referenceId: "mocked-id",
        blocks: [{ content: "block5", id: "mocked-id" }],
      },
    });
  });

  it("should handle non-partial, non-update insert operations", async () => {
    const insertOp = {
      operation: {
        type: "insert",
        blocks: [{ content: "block1" }],
        referenceId: "ref1",
        position: "after",
      } as BlockNoteOperation,
      isUpdateToPreviousOperation: false,
      isPossiblyPartial: false,
    };

    async function* mockStream() {
      yield insertOp;
    }

    const result = [];
    for await (const chunk of duplicateInsertsToUpdates(mockStream())) {
      result.push(chunk);
    }

    expect(result.length).toBe(1);
    expect(result[0]).toEqual(insertOp);
  });
});
