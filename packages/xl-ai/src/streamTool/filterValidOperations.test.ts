import { describe, expect, it } from "vitest";
import { AddBlocksToolCall } from "../api/formats/base-tools/createAddBlocksTool.js";
import { UpdateBlockToolCall } from "../api/formats/base-tools/createUpdateBlockTool.js";
import { filterValidOperations } from "./filterValidOperations.js";
import { Result } from "./streamTool.js";

// REC: better to make unit tests independent of BlockNote code (tools)
describe("filterValidOperations", () => {
  it("should filter out valid operations from a stream", async () => {
    // Create a mock stream with valid and invalid operations
    async function* mockStream() {
      yield {
        operation: {
          ok: true,
          value: {
            type: "add",
            blocks: [],
            referenceId: "123",
            position: "after",
          } as AddBlocksToolCall<any>,
        } as Result<AddBlocksToolCall<any> | UpdateBlockToolCall<any>>,
        isUpdateToPreviousOperation: false,
        isPossiblyPartial: false,
      };

      yield {
        operation: {
          ok: false,
          error: "Invalid operation",
        } as Result<AddBlocksToolCall<any> | UpdateBlockToolCall<any>>,
        isUpdateToPreviousOperation: false,
        isPossiblyPartial: false,
      };

      yield {
        operation: {
          ok: true,
          value: {
            type: "update",
            id: "456",
            block: { content: "updated" },
          } as UpdateBlockToolCall<any>,
        } as Result<AddBlocksToolCall<any> | UpdateBlockToolCall<any>>,
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
        type: "add",
        blocks: [],
        referenceId: "123",
        position: "after",
      },
      isUpdateToPreviousOperation: false,
      isPossiblyPartial: false,
    });

    expect(result[1]).toEqual({
      operation: { type: "update", id: "456", block: { content: "updated" } },
      isUpdateToPreviousOperation: false,
      isPossiblyPartial: true,
    });
  });

  it("should handle a stream with only invalid operations", async () => {
    async function* mockStream() {
      yield {
        operation: {
          ok: false,
          error: "Invalid operation 1",
        } as Result<AddBlocksToolCall<any> | UpdateBlockToolCall<any>>,
        isUpdateToPreviousOperation: false,
        isPossiblyPartial: false,
      };

      yield {
        operation: {
          ok: false,
          error: "Invalid operation 2",
        } as Result<AddBlocksToolCall<any> | UpdateBlockToolCall<any>>,
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
