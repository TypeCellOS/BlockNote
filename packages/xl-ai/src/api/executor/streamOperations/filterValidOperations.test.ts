import { describe, expect, it } from "vitest";
import {
  BlockNoteOperation,
  InvalidOrOk,
} from "../../functions/blocknoteFunctions.js";
import { filterValidOperations } from "./filterValidOperations.js";

describe("filterValidOperations", () => {
  it("should filter out valid operations from a stream", async () => {
    // Create a mock stream with valid and invalid operations
    async function* mockStream() {
      yield {
        operation: {
          result: "ok",
          value: {
            type: "insert",
            blocks: [],
            referenceId: "123",
            position: "after",
          },
        } as InvalidOrOk<BlockNoteOperation>,
        isUpdateToPreviousOperation: false,
        isPossiblyPartial: false,
      };

      yield {
        operation: {
          result: "invalid",
          reason: "Invalid operation",
        } as InvalidOrOk<BlockNoteOperation>,
        isUpdateToPreviousOperation: false,
        isPossiblyPartial: false,
      };

      yield {
        operation: {
          result: "ok",
          value: { type: "update", id: "456", block: { content: "updated" } },
        } as InvalidOrOk<BlockNoteOperation>,
        isUpdateToPreviousOperation: true,
        isPossiblyPartial: true,
      };
    }

    const result = [];
    for await (const chunk of filterValidOperations(mockStream())) {
      result.push(chunk);
    }

    // Should only have the valid operations
    expect(result.length).toBe(2);

    expect(result[0]).toEqual({
      operation: {
        type: "insert",
        blocks: [],
        referenceId: "123",
        position: "after",
      },
      isUpdateToPreviousOperation: false,
      isPossiblyPartial: false,
    });

    expect(result[1]).toEqual({
      operation: { type: "update", id: "456", block: { content: "updated" } },
      isUpdateToPreviousOperation: true,
      isPossiblyPartial: true,
    });
  });

  it("should handle a stream with only invalid operations", async () => {
    async function* mockStream() {
      yield {
        operation: {
          result: "invalid",
          reason: "Invalid operation 1",
        } as InvalidOrOk<BlockNoteOperation>,
        isUpdateToPreviousOperation: false,
        isPossiblyPartial: false,
      };

      yield {
        operation: {
          result: "invalid",
          reason: "Invalid operation 2",
        } as InvalidOrOk<BlockNoteOperation>,
        isUpdateToPreviousOperation: true,
        isPossiblyPartial: false,
      };
    }

    const result = [];
    for await (const chunk of filterValidOperations(mockStream())) {
      result.push(chunk);
    }

    // Should have no valid operations
    expect(result.length).toBe(0);
  });
});
