import { BlockNoteEditor } from "@blocknote/core";
import { beforeEach, describe, expect, it } from "vitest";
import { addFunction } from "../functions/add.js";
import { deleteFunction } from "../functions/delete.js";
import { AIFunction } from "../functions/index.js";
import { updateFunction } from "../functions/update.js";
import { executeOperations } from "./executor.js";

describe("executeOperations", () => {
  let editor: BlockNoteEditor;
  const functions: AIFunction[] = [addFunction, deleteFunction, updateFunction];

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
    async function* mockStream(): AsyncGenerator<any> {
      yield {
        operations: [
          {
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
        ],
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
    async function* mockStream(): AsyncGenerator<any> {
      yield {
        operations: [op1],
      };
      yield {
        operations: [
          op1,
          {
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
        ],
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

    expect(results.length).toBe(3);
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
    async function* mockStream(): AsyncGenerator<any> {
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
    async function* mockStream(): AsyncGenerator<any> {
      yield {
        operations: [
          {
            type: "invalid",
          },
        ],
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
    async function* mockStream(): AsyncGenerator<any> {
      yield {
        operations: [
          {
            type: "update" as const,
            id: "existing-id$",
            block: {
              content: [{ type: "text", text: "updated" }],
            },
          },
        ],
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
