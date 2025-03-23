import { BlockNoteEditor } from "@blocknote/core";
import { beforeEach, describe, expect, it } from "vitest";

import {
  AIFunctionJSON,
  AddFunctionJSON,
  UpdateFunctionJSON,
} from "../formats/json/functions/index.js";
import { DeleteFunction } from "../functions/delete.js";
import { executeOperations } from "./executor.js";

type StreamType = AsyncIterable<{
  partialOperation: any;
  isUpdateToPreviousOperation: boolean;
  isPossiblyPartial: boolean;
}>;
describe("executeOperations", () => {
  let editor: BlockNoteEditor;
  const functions: AIFunctionJSON[] = [
    new AddFunctionJSON(),
    new DeleteFunction(),
    new UpdateFunctionJSON(),
  ];

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
  });

  it("should process insert operations", async () => {
    async function* mockStream(): StreamType {
      yield {
        partialOperation: {
          type: "add" as const,
          referenceId: "existing-id$",
          position: "after" as const,
          blocks: [
            {
              type: "paragraph" as const,
              content: [{ type: "text" as const, text: "test" }],
            },
          ],
        },
        isUpdateToPreviousOperation: false,
        isPossiblyPartial: false,
      };
    }

    const results: any[] = [];
    for await (const result of executeOperations(
      editor,
      mockStream(),
      functions
    )) {
      results.push(result);
    }

    expect(results.length).toBe(1);
    expect(results[0].result).toBe("ok");
    expect(editor.document.length).toBe(2);
    expect(editor.document[1]).toMatchObject({
      type: "paragraph",
      content: [{ type: "text", text: "test" }],
    });
  });

  it("should handle multiple operations in sequence", async () => {
    const op1 = {
      type: "add" as const,
      position: "after" as const,
      referenceId: "existing-id$",
      blocks: [
        {
          type: "paragraph" as const,
          content: [{ type: "text" as const, text: "first" }],
        },
      ],
    };
    async function* mockStream(): StreamType {
      yield {
        partialOperation: op1,
        isUpdateToPreviousOperation: false,
        isPossiblyPartial: false,
      };
      yield {
        partialOperation: {
          type: "add" as const,
          position: "after" as const,
          referenceId: "existing-id$",
          blocks: [
            {
              type: "paragraph" as const,
              content: [{ type: "text" as const, text: "second" }],
            },
          ],
        },
        isUpdateToPreviousOperation: false,
        isPossiblyPartial: false,
      };
    }

    const results: any[] = [];
    for await (const result of executeOperations(
      editor,
      mockStream(),
      functions
    )) {
      results.push(result);
    }

    expect(results.length).toBe(2);
    expect(editor.document.length).toBe(3);
    expect(editor.document[1]).toMatchObject({
      type: "paragraph",
      content: [{ type: "text", text: "second" }],
    });
    expect(editor.document[2]).toMatchObject({
      type: "paragraph",
      content: [{ type: "text", text: "first" }],
    });
  });

  it("should handle empty operation streams", async () => {
    async function* mockStream(): StreamType {
      // Empty stream
    }

    const results: any[] = [];
    for await (const result of executeOperations(
      editor,
      mockStream(),
      functions
    )) {
      results.push(result);
    }

    expect(results).toHaveLength(0);
    expect(editor.document.length).toBe(1);
  });

  it("should handle invalid operations", async () => {
    async function* mockStream(): StreamType {
      yield {
        partialOperation: {
          type: "invalid",
        },
        isUpdateToPreviousOperation: false,
        isPossiblyPartial: false,
      };
    }

    const results: any[] = [];
    for await (const result of executeOperations(
      editor,
      mockStream(),
      functions
    )) {
      results.push(result);
    }

    expect(results.length).toBe(0);
  });

  it("should handle update operations", async () => {
    async function* mockStream(): StreamType {
      yield {
        partialOperation: {
          type: "update" as const,
          id: "existing-id$",
          block: {
            content: [{ type: "text", text: "updated" }],
          },
        },
        isUpdateToPreviousOperation: false,
        isPossiblyPartial: false,
      };
    }

    const results: any[] = [];
    for await (const result of executeOperations(
      editor,
      mockStream(),
      functions
    )) {
      results.push(result);
    }

    expect(results.length).toBe(1);
    expect(results[0].result).toBe("ok");
    expect(editor.document[0]).toMatchObject({
      type: "paragraph",
      content: [{ type: "text", text: "updated" }],
    });
  });
});
