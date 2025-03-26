import { describe, expect, it } from "vitest";
import { filterNewOrUpdatedOperations } from "./filterNewOrUpdatedOperations.js";

describe("filterNewOrUpdatedOperations", () => {
  it("should filter out new operations from a stream", async () => {
    // Create a mock stream
    async function* mockStream() {
      yield {
        operations: [
          { id: 1, content: "op1" },
          { id: 2, content: "op2-partial" },
        ],
      };
      yield {
        operations: [
          { id: 1, content: "op1" },
          { id: 2, content: "op2-complete" },
          { id: 3, content: "op3" },
        ],
      };
    }

    const result = [];
    for await (const chunk of filterNewOrUpdatedOperations(mockStream())) {
      result.push(chunk);
    }

    expect(result.length).toBe(5);

    // First chunk should have op1 and op2-partial
    expect(result[0]).toEqual({
      partialOperation: { id: 1, content: "op1" },
      isUpdateToPreviousOperation: false,
      isPossiblyPartial: false,
    });

    expect(result[1]).toEqual({
      partialOperation: { id: 2, content: "op2-partial" },
      isUpdateToPreviousOperation: false,
      isPossiblyPartial: true,
    });

    expect(result[2]).toEqual({
      partialOperation: { id: 2, content: "op2-complete" },
      isUpdateToPreviousOperation: true,
      isPossiblyPartial: false,
    });

    expect(result[3]).toEqual({
      partialOperation: { id: 3, content: "op3" },
      isUpdateToPreviousOperation: false,
      isPossiblyPartial: true,
    });

    expect(result[4]).toEqual({
      partialOperation: { id: 3, content: "op3" },
      isUpdateToPreviousOperation: true,
      isPossiblyPartial: false,
    });
  });

  it("should filter out new operations from a stream (partial start)", async () => {
    // Create a mock stream
    async function* mockStream() {
      yield {
        operations: [{ id: 1, content: "op1-partial" }],
      };
      yield {
        operations: [
          { id: 1, content: "op1-complete" },
          { id: 2, content: "op2" },
        ],
      };
    }

    const result = [];
    for await (const chunk of filterNewOrUpdatedOperations(mockStream())) {
      result.push(chunk);
    }

    expect(result.length).toBe(4);

    // First chunk should have op1-partial
    expect(result[0]).toEqual({
      partialOperation: { id: 1, content: "op1-partial" },
      isUpdateToPreviousOperation: false,
      isPossiblyPartial: true,
    });

    // Second chunk should have op1-complete
    expect(result[1]).toEqual({
      partialOperation: { id: 1, content: "op1-complete" },
      isUpdateToPreviousOperation: true,
      isPossiblyPartial: false,
    });

    // Third chunk should have op2
    expect(result[2]).toEqual({
      partialOperation: { id: 2, content: "op2" },
      isUpdateToPreviousOperation: false,
      isPossiblyPartial: true,
    });

    expect(result[3]).toEqual({
      partialOperation: { id: 2, content: "op2" },
      isUpdateToPreviousOperation: true,
      isPossiblyPartial: false,
    });
  });

  it("should handle empty operations array", async () => {
    async function* mockStream() {
      yield { operations: [] };
      yield { operations: [{ id: 1, content: "op1" }] };
    }

    const result = [];
    for await (const chunk of filterNewOrUpdatedOperations(mockStream())) {
      result.push(chunk);
    }

    expect(result.length).toBe(2);
    expect(result[0]).toEqual({
      partialOperation: { id: 1, content: "op1" },
      isUpdateToPreviousOperation: false,
      isPossiblyPartial: true,
    });
    expect(result[1]).toEqual({
      partialOperation: { id: 1, content: "op1" },
      isUpdateToPreviousOperation: true,
      isPossiblyPartial: false,
    });
  });

  it("should handle undefined operations", async () => {
    async function* mockStream() {
      yield {};
      yield { operations: [{ id: 1, content: "op1" }] };
    }

    const result = [];
    for await (const chunk of filterNewOrUpdatedOperations(mockStream())) {
      result.push(chunk);
    }

    expect(result.length).toBe(2);
    expect(result[0]).toEqual({
      partialOperation: { id: 1, content: "op1" },
      isUpdateToPreviousOperation: false,
      isPossiblyPartial: true,
    });
    expect(result[1]).toEqual({
      partialOperation: { id: 1, content: "op1" },
      isUpdateToPreviousOperation: true,
      isPossiblyPartial: false,
    });
  });
});
