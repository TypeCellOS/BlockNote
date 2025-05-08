import { describe, expect, it } from "vitest";
import {
  getApplySuggestionsTr,
  rebaseTool,
} from "../../../prosemirror/rebaseTool.js";
import {
  getTestEditor,
  testUpdateOperations,
} from "../../../testUtil/updates/updateOperations.js";

import {
  BlockNoteEditor,
  partialBlockToBlockForTesting,
} from "@blocknote/core";
import { getAIExtension } from "../../../AIExtension.js";
import { AddBlocksToolCall } from "../../tools/createAddBlocksTool.js";
import { UpdateBlockToolCall } from "../../tools/createUpdateBlockTool.js";
import { DeleteBlockToolCall } from "../../tools/delete.js";
import { applyOperations } from "./applyOperations.js";

// TODO: make possible to apply steps without agent mode
// TODO: organize unit tests
// TODO: fix unit tests

describe("applyOperations", () => {
  // Helper function to create a mock stream from operations
  async function* createMockStream(
    ...operations: {
      operation:
        | AddBlocksToolCall<any>
        | UpdateBlockToolCall<any>
        | DeleteBlockToolCall;
      isUpdateToPreviousOperation?: boolean;
      isPossiblyPartial?: boolean;
    }[]
  ) {
    for (const op of operations) {
      yield {
        isUpdateToPreviousOperation: false,
        isPossiblyPartial: false,
        ...op,
      };
    }
  }

  // Helper function to process operations and return results
  async function processOperations(
    editor: BlockNoteEditor<any, any, any>,
    stream: AsyncIterable<{
      operation:
        | AddBlocksToolCall<any>
        | UpdateBlockToolCall<any>
        | DeleteBlockToolCall;
      isUpdateToPreviousOperation: boolean;
      isPossiblyPartial: boolean;
    }>
  ) {
    const result = [];
    for await (const chunk of applyOperations(
      editor,
      stream,
      async (_id) => {
        return rebaseTool(editor, getApplySuggestionsTr(editor));
      },
      {
        withDelays: false,
      }
    )) {
      result.push(chunk);
    }

    await getAIExtension(editor).acceptChanges();

    return result;
  }

  it("should apply insert operations to the editor", async () => {
    const editor = getTestEditor();
    const insertOp = {
      operation: {
        type: "add",
        blocks: [{ content: "block1" }],
        referenceId: "ref1",
        position: "after",
      } as AddBlocksToolCall<any>,
    };

    const result = await processOperations(editor, createMockStream(insertOp));

    // Should call insertBlocks with the right parameters
    expect(editor.document[1]).toMatchObject({
      content: [{ text: "block1" }],
    });

    // Should yield the operation with result: "ok"
    expect(result.length).toBe(1);
    expect(result[0]).toEqual({
      lastBlockId: "0",
      operation: insertOp.operation,
      result: "ok",
    });
  });

  for (const testCase of testUpdateOperations) {
    // eslint-disable-next-line no-loop-func
    it(`should apply update operations to the editor (${testCase.description})`, async () => {
      const editor = testCase.editor();
      const result = await processOperations(
        editor,
        createMockStream({ operation: testCase.updateOp })
      );

      // Should call updateBlock with the right parameters
      const update = testCase.updateOp.block;
      const block = editor.getBlock(testCase.updateOp.id)!;
      if (update.type) {
        // eslint-disable-next-line
        expect(block.type).toEqual(update.type);
      }
      if (update.props) {
        // eslint-disable-next-line
        expect(block.props).toMatchObject(update.props);
      }

      if (update.content) {
        const partialBlock = {
          type: block.type,
          ...update,
        };
        // eslint-disable-next-line
        expect(block.content).toEqual(
          partialBlockToBlockForTesting(editor.schema.blockSchema, partialBlock)
            .content
        );
      }

      // Should yield the operation with result: "ok"
      // expect(result.length).toBe(14);
      expect(result[0]).toEqual({
        isPossiblyPartial: false,
        isUpdateToPreviousOperation: false,
        lastBlockId: testCase.updateOp.id,
        operation: testCase.updateOp,
        result: "ok",
      });
    });
  }

  it("should apply remove operations to the editor", async () => {
    const editor = getTestEditor();
    const startDocLength = editor.document.length;
    const removeOp = {
      operation: {
        type: "delete",
        id: "ref1",
      } as DeleteBlockToolCall,
    };

    const result = await processOperations(editor, createMockStream(removeOp));

    // Should call removeBlocks with the right parameters
    expect(editor.document.length).toBe(startDocLength - 1);
    expect(editor.document[0].id).toEqual("ref2");

    // Should yield the operation with result: "ok"
    expect(result.length).toBe(2);
    expect(result[0]).toEqual({
      isPossiblyPartial: false,
      isUpdateToPreviousOperation: false,
      lastBlockId: "ref1",
      operation: removeOp.operation,
      result: "ok",
    });
  });

  it("should handle multiple operations in sequence", async () => {
    const editor = getTestEditor();
    const startDocLength = editor.document.length;
    const insertOp = {
      operation: {
        type: "add",
        blocks: [{ content: "block1" }],
        referenceId: "ref1",
        position: "after",
      } as AddBlocksToolCall<any>,
    };

    const updateOp = {
      operation: {
        type: "update",
        id: "ref1",
        block: { content: "updated content" },
      } as UpdateBlockToolCall<any>,
    };

    await processOperations(editor, createMockStream(insertOp, updateOp));

    // Should call all the editor methods with the right parameters
    expect(editor.document[1]).toMatchObject({
      content: [{ text: "block1" }],
    });

    expect(editor.document[0]).toMatchObject({
      content: [{ text: "updated content" }],
    });

    expect(editor.document.length).toBe(startDocLength + 1);
  });

  // TODO: delete
  it.skip("test", async () => {
    const numbers = [1, 2, 3, 4, 5];

    async function* multiply(numbersStream: AsyncIterable<number>) {
      for await (const number of numbersStream) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log("multiply", number);
        yield number * 2;
      }
    }

    async function* add(numbersStream: AsyncIterable<number>) {
      for await (const number of numbersStream) {
        console.log("add", number);
        yield number + 1;
      }
    }

    async function* createMockStream(numbers: number[]) {
      for (const number of numbers) {
        yield number;
      }
    }

    const result = multiply(add(createMockStream(numbers)));

    for await (const number of result) {
      console.log(number);
    }
  });
});
