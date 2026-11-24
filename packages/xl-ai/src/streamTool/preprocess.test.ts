import { describe, expect } from "vite-plus/test";
import type { SetupEditor } from "../../../../tests/src/commands/node/setupEditor.js";
import { tools } from "../api/formats/json/tools/index.js";
import { preprocessOperationsStreaming } from "./preprocess.js";

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

async function setupStreamTools(setupEditor: SetupEditor) {
  const { editor } = await setupEditor({
    initialContent: [
      {
        type: "paragraph",
        content: "test",
        id: "existing-id",
      },
    ],
  });
  return [
    tools.add(editor, { idsSuffixed: true, withDelays: false }),
    tools.update(editor, { idsSuffixed: true, withDelays: false }),
    tools.delete(editor, { idsSuffixed: true, withDelays: false }),
  ];
}

describe("preprocess", () => {
  describe("preprocessOperationsStreaming", () => {
    it("should process pass valid operations", async ({ setupEditor }) => {
      const streamTools = await setupStreamTools(setupEditor);
      async function* mockStream() {
        yield {
          partialOperation: addOperationValid,
          isUpdateToPreviousOperation: false,
          isPossiblyPartial: false,
          metadata: undefined,
        };
      }

      const results = await collectStreamToArray(
        preprocessOperationsStreaming(mockStream(), streamTools),
      );

      expect(results.length).toBe(1);
    });

    it("should drop invalid partial operations", async ({ setupEditor }) => {
      const streamTools = await setupStreamTools(setupEditor);
      async function* mockStream() {
        yield {
          partialOperation: addOperationInvalidId,
          isUpdateToPreviousOperation: false,
          isPossiblyPartial: true,
          metadata: undefined,
        };
        yield {
          partialOperation: invalidOperationType,
          isUpdateToPreviousOperation: false,
          isPossiblyPartial: true,
          metadata: undefined,
        };
      }

      const results = await collectStreamToArray(
        preprocessOperationsStreaming(mockStream(), streamTools),
      );

      expect(results.length).toBe(0);
    });

    it("should throw invalid full operations", async ({ setupEditor }) => {
      const streamTools = await setupStreamTools(setupEditor);
      async function* mockStream() {
        yield {
          partialOperation: addOperationInvalidId,
          isUpdateToPreviousOperation: false,
          isPossiblyPartial: false,
          metadata: undefined,
        };
        yield {
          partialOperation: invalidOperationType,
          isUpdateToPreviousOperation: false,
          isPossiblyPartial: false,
          metadata: undefined,
        };
      }

      await expect(
        collectStreamToArray(
          preprocessOperationsStreaming(mockStream(), streamTools),
        ),
      ).rejects.toThrow();
    });

    it("should handle empty operation streams", async ({ setupEditor }) => {
      const streamTools = await setupStreamTools(setupEditor);
      async function* mockStream() {
        // Empty stream
      }

      const results = await collectStreamToArray(
        preprocessOperationsStreaming(mockStream(), streamTools),
      );

      expect(results).toHaveLength(0);
    });
  });

  it("should throw an error on invalid operations (invalid id)", async ({
    setupEditor,
  }) => {
    const streamTools = await setupStreamTools(setupEditor);
    async function* mockStream() {
      yield {
        partialOperation: addOperationInvalidId,
        isUpdateToPreviousOperation: false,
        isPossiblyPartial: false,
        metadata: undefined,
      };
    }

    await expect(
      collectStreamToArray(
        preprocessOperationsStreaming(mockStream(), streamTools),
      ),
    ).rejects.toThrow();
  });

  it("should throw an error on invalid operations (invalid type)", async ({
    setupEditor,
  }) => {
    const streamTools = await setupStreamTools(setupEditor);
    async function* mockStream() {
      yield {
        partialOperation: invalidOperationType,
        isUpdateToPreviousOperation: false,
        isPossiblyPartial: false,
        metadata: undefined,
      };
    }

    await expect(
      collectStreamToArray(
        preprocessOperationsStreaming(mockStream(), streamTools),
      ),
    ).rejects.toThrow();
  });
});
