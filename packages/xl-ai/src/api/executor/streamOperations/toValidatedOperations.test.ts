import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vitest";
import {
  AddFunctionJSON,
  UpdateFunctionJSON,
} from "../../formats/json/functions/index.js";
import {
  InsertBlocksOperation,
  InvalidOrOk,
  UpdateBlocksOperation,
} from "../../functions/blocknoteFunctions.js";
import { toValidatedOperations } from "./toValidatedOperations.js";

describe("toValidatedOperations", () => {
  // Mock editor with getBlock method and schema
  const mockEditor = {
    getBlock: (id: string) => {
      // Return a mock block for the test cases
      if (id === "ref1" || id === "block1") {
        return { id, type: "paragraph" };
      }
      return null;
    },
    schema: {
      blockSchema: {
        paragraph: {
          propSchema: {},
          content: "inline",
        },
      },
      inlineContentSchema: {
        text: "text",
      },
    },
  } as unknown as BlockNoteEditor;

  // Array of test functions
  const functions = [new AddFunctionJSON(), new UpdateFunctionJSON()];

  it("should transform add operations to BlockNoteOperations", async () => {
    // Create a mock stream
    async function* mockStream() {
      yield {
        partialOperation: {
          type: "add",
          referenceId: "ref1$",
          position: "after",
          blocks: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "test" }],
            },
          ],
        },
        isUpdateToPreviousOperation: false,
        isPossiblyPartial: false,
      };
    }

    const result = [];
    for await (const chunk of toValidatedOperations(
      mockEditor,
      mockStream(),
      functions
    )) {
      result.push(chunk);
    }

    // Should yield the transformed operation
    expect(result.length).toBe(1);
    testAddOperation(result[0]);
  });

  it("should skip operations with no matching function", async () => {
    // Create a mock stream with an operation that has no matching function
    async function* mockStream() {
      yield {
        partialOperation: { type: "unknown", content: "test" },
        isUpdateToPreviousOperation: false,
        isPossiblyPartial: true,
      };
    }

    const result = [];
    for await (const chunk of toValidatedOperations(
      mockEditor,
      mockStream(),
      functions
    )) {
      result.push(chunk);
    }

    // Should not yield any operations
    expect(result.length).toBe(0);
  });

  it("should handle add and update operations in sequence", async () => {
    // Create a mock stream with multiple operations
    async function* mockStream() {
      yield {
        partialOperation: {
          type: "add",
          referenceId: "ref1$",
          position: "after",
          blocks: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "test" }],
            },
          ],
        },
        isUpdateToPreviousOperation: false,
        isPossiblyPartial: false,
      };
      yield {
        partialOperation: {
          type: "update",
          id: "block1$",
          block: {
            type: "paragraph",
            content: [{ type: "text", text: "updated" }],
          },
        },
        isUpdateToPreviousOperation: true,
        isPossiblyPartial: true,
      };
    }

    const result = [];
    for await (const chunk of toValidatedOperations(
      mockEditor,
      mockStream(),
      functions
    )) {
      result.push(chunk);
    }

    // Should yield both operations
    expect(result.length).toBe(2);

    // Test the add operation
    testAddOperation(result[0]);

    // Test the update operation
    testUpdateOperation(result[1]);
  });

  it("should handle invalid operations", async () => {
    // Create a mock stream with an invalid operation
    async function* mockStream() {
      yield {
        partialOperation: {
          type: "add",
          // Missing required fields (referenceId and position)
          blocks: [{ content: "test" }],
        },
        isUpdateToPreviousOperation: false,
        isPossiblyPartial: true,
      };
    }

    const result = [];
    for await (const chunk of toValidatedOperations(
      mockEditor,
      mockStream(),
      functions
    )) {
      result.push(chunk);
    }

    // Should yield the invalid operation
    expect(result.length).toBe(1);
    expect(result[0].operation.result).toBe("invalid");
    expect(result[0].isUpdateToPreviousOperation).toBe(false);
    expect(result[0].isPossiblyPartial).toBe(true);
  });

  // Helper function to test add operations
  function testAddOperation(result: {
    operation: InvalidOrOk<any>;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }) {
    expect(result.operation.result).toBe("ok");
    expect(result.isUpdateToPreviousOperation).toBe(false);
    expect(result.isPossiblyPartial).toBe(false);

    // Skip if not valid
    if (result.operation.result !== "ok") {
      return;
    }

    const insertOp = result.operation.value as InsertBlocksOperation<any>;
    expect(insertOp.type).toBe("add");
    expect(insertOp.position).toBe("after");
    expect(insertOp.blocks).toEqual([
      {
        type: "paragraph",
        content: [{ type: "text", text: "test" }],
      },
    ]);
  }

  // Helper function to test update operations
  function testUpdateOperation(result: {
    operation: InvalidOrOk<any>;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }) {
    expect(result.operation.result).toBe("ok");
    expect(result.isUpdateToPreviousOperation).toBe(true);
    expect(result.isPossiblyPartial).toBe(true);

    // Skip if not valid
    if (result.operation.result !== "ok") {
      return;
    }

    const updateOp = result.operation.value as UpdateBlocksOperation<any>;
    expect(updateOp.type).toBe("update");
    expect(updateOp.block).toEqual({
      type: "paragraph",
      content: [{ type: "text", text: "updated" }],
    });
  }
});
