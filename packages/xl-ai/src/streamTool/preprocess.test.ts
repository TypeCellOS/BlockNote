import { BlockNoteEditor } from "@blocknote/core";
import { beforeEach, describe, expect, it } from "vitest";
import { tools } from "../api/formats/json/tools/index.js";
import {
  preprocessOperationsNonStreaming,
  preprocessOperationsStreaming,
} from "./preprocess.js";
import { StreamTool } from "./streamTool.js";

const addOperationValid = {
  type: "add" as const,
  referenceId: "existing-id$",
  position: "after" as const,
  blocks: [
    {
      type: "paragraph" as const,
      content: [{ type: "text" as const, text: "test" }],
    },
  ],
};

const addOperationInvalidId = {
  type: "add" as const,
  referenceId: "existing-id",
  position: "after" as const,
  blocks: [
    {
      type: "paragraph" as const,
      content: [{ type: "text" as const, text: "test" }],
    },
  ],
};

const invalidOperationType = {
  type: "invalid" as const,
  referenceId: "existing-id",
  position: "after" as const,
  blocks: [
    {
      type: "paragraph" as const,
      content: [{ type: "text" as const, text: "test" }],
    },
  ],
};

async function collectStreamToArray<T>(stream: AsyncIterable<T>): Promise<T[]> {
  const results: T[] = [];
  for await (const result of stream) {
    results.push(result);
  }
  return results;
}

describe("preprocess", () => {
  let editor: BlockNoteEditor;
  let streamTools: StreamTool<any>[];
  beforeEach(() => {
    editor = BlockNoteEditor.create({
      initialContent: [
        {
          type: "paragraph",
          content: "test",
          id: "existing-id",
        },
      ],
    });
    streamTools = [
      tools.add(editor, { idsSuffixed: true, withDelays: false }),
      tools.update(editor, { idsSuffixed: true, withDelays: false }),
      tools.delete(editor, { idsSuffixed: true, withDelays: false }),
    ];
  });

  describe("preprocessOperationsStreaming", () => {
    it("should process pass valid operations", async () => {
      async function* mockStream() {
        yield {
          partialOperation: addOperationValid,
          isUpdateToPreviousOperation: false,
          isPossiblyPartial: false,
        };
      }

      const results = await collectStreamToArray(
        preprocessOperationsStreaming(mockStream(), streamTools),
      );

      expect(results.length).toBe(1);
    });

    it("should drop invalid partial operations", async () => {
      async function* mockStream() {
        yield {
          partialOperation: addOperationInvalidId,
          isUpdateToPreviousOperation: false,
          isPossiblyPartial: true,
        };
        yield {
          partialOperation: invalidOperationType,
          isUpdateToPreviousOperation: false,
          isPossiblyPartial: true,
        };
      }

      const results = await collectStreamToArray(
        preprocessOperationsStreaming(mockStream(), streamTools),
      );

      expect(results.length).toBe(0);
    });

    it("should throw invalid full operations", async () => {
      async function* mockStream() {
        yield {
          partialOperation: addOperationInvalidId,
          isUpdateToPreviousOperation: false,
          isPossiblyPartial: false,
        };
        yield {
          partialOperation: invalidOperationType,
          isUpdateToPreviousOperation: false,
          isPossiblyPartial: false,
        };
      }

      await expect(
        collectStreamToArray(
          preprocessOperationsStreaming(mockStream(), streamTools),
        ),
      ).rejects.toThrow();
    });

    it("should handle empty operation streams", async () => {
      async function* mockStream() {
        // Empty stream
      }

      const results = await collectStreamToArray(
        preprocessOperationsStreaming(mockStream(), streamTools),
      );

      expect(results).toHaveLength(0);
    });
  });

  describe("preprocessOperationsNonStreaming", () => {
    it("should pass valid operations", async () => {
      async function* mockStream() {
        yield {
          partialOperation: addOperationValid,
          isUpdateToPreviousOperation: false,
          isPossiblyPartial: false,
        };
      }

      const results = await collectStreamToArray(
        preprocessOperationsNonStreaming(mockStream(), streamTools),
      );

      expect(results.length).toBe(1);
    });

    it("should throw an error on invalid operations (invalid id)", async () => {
      async function* mockStream() {
        yield {
          partialOperation: addOperationInvalidId,
          isUpdateToPreviousOperation: false,
          isPossiblyPartial: false,
        };
      }

      await expect(
        collectStreamToArray(
          preprocessOperationsNonStreaming(mockStream(), streamTools),
        ),
      ).rejects.toThrow();
    });

    it("should throw an error on invalid operations (invalid type)", async () => {
      async function* mockStream() {
        yield {
          partialOperation: invalidOperationType,
          isUpdateToPreviousOperation: false,
          isPossiblyPartial: false,
        };
      }

      await expect(
        collectStreamToArray(
          preprocessOperationsNonStreaming(mockStream(), streamTools),
        ),
      ).rejects.toThrow();
    });

    it("should handle empty operation streams", async () => {
      async function* mockStream() {
        // Empty stream
      }

      const results = await collectStreamToArray(
        preprocessOperationsNonStreaming(mockStream(), streamTools),
      );

      expect(results).toHaveLength(0);
    });
  });
});
