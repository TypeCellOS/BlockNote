import { BlockNoteEditor } from "@blocknote/core";
import { beforeEach, describe, expect, it } from "vitest";

import { tools } from "../api/formats/json/tools/index.js";
import { StreamTool } from "./streamTool.js";
import { toValidatedOperations } from "./toValidatedOperations.js";

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

describe("toValidatedOperations", () => {
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

  it("should keep mark mark valid / invalid operations", async () => {
    // Create a mock stream
    async function* mockStream() {
      for (const operation of [
        addOperationValid,
        addOperationInvalidId,
        invalidOperationType,
      ]) {
        yield {
          partialOperation: operation,
          isUpdateToPreviousOperation: false,
          isPossiblyPartial: false,
        };
      }
    }

    const result = await collectStreamToArray(
      toValidatedOperations(mockStream(), streamTools),
    );

    // Should yield the transformed operation
    expect(result.length).toBe(3);
    expect(result[0].operation.ok).toBe(true);
    expect(result[1].operation.ok).toBe(false);
    expect(result[2].operation.ok).toBe(false);
  });
});
