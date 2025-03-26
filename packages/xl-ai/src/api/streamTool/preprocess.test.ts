import { BlockNoteEditor } from "@blocknote/core";
import { beforeEach, describe, expect, it } from "vitest";

import { applyOperations } from "../executor/streamOperations/applyOperations.js";
import { tools } from "../formats/json/tools/index.js";

import {
  getApplySuggestionsTr,
  rebaseTool,
} from "../../prosemirror/rebaseTool.js";
import { preprocessOperationsStreaming } from "./preprocess.js";
import { StreamTool } from "./streamTool.js";

type StreamType = AsyncIterable<{
  partialOperation: any;
  isUpdateToPreviousOperation: boolean;
  isPossiblyPartial: boolean;
}>;

const streamTools = [tools.add, tools.update, tools.delete];

// TODO: maybe change unit test or move to json test, because this does not only test preprocess
// but also applyOperations
async function* executeOperations(
  editor: BlockNoteEditor,
  operationsStream: StreamType,
  streamTools: StreamTool<any>[]
) {
  const preprocessedOperationsStream = preprocessOperationsStreaming(
    editor,
    operationsStream,
    streamTools
  );

  yield* applyOperations(
    editor,
    preprocessedOperationsStream,
    async () => rebaseTool(editor, getApplySuggestionsTr(editor)),
    { withDelays: false }
  );
}

describe("executeOperations", () => {
  let editor: BlockNoteEditor;

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
      streamTools
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
      streamTools
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
      streamTools
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
      streamTools
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
      streamTools
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
