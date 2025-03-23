import { beforeEach, describe, expect, it } from "vitest";
import {
  getTestEditor,
  testUpdateOperations,
} from "../../../testUtil/updates/updateOperations.js";
import {
  BlockNoteOperation,
  InsertBlocksOperation,
  RemoveBlocksOperation,
  UpdateBlocksOperation,
} from "../../functions/blocknoteFunctions.js";
import { applyOperations } from "./applyOperations.js";

describe("applyOperations", () => {
  let editor: ReturnType<typeof getTestEditor>;

  beforeEach(() => {
    editor = getTestEditor();
  });

  // Helper function to create a mock stream from operations
  async function* createMockStream(
    ...operations: {
      operation: BlockNoteOperation<any>;
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
    stream: AsyncIterable<{
      operation: BlockNoteOperation<any>;
      isUpdateToPreviousOperation: boolean;
      isPossiblyPartial: boolean;
    }>
  ) {
    const result = [];
    for await (const chunk of applyOperations(editor, stream, {
      withDelays: false,
    })) {
      result.push(chunk);
    }
    return result;
  }

  it("should apply insert operations to the editor", async () => {
    const insertOp = {
      operation: {
        type: "add",
        blocks: [{ content: "block1" }],
        referenceId: "ref1",
        position: "after",
      } as InsertBlocksOperation<any>,
    };

    const result = await processOperations(createMockStream(insertOp));

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
      const result = await processOperations(
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
        // eslint-disable-next-line
        expect(block.content).toEqual(update.content);
      }

      // Should yield the operation with result: "ok"
      expect(result.length).toBe(1);
      expect(result[0]).toEqual({
        lastBlockId: testCase.updateOp.id,
        operation: testCase.updateOp,
        result: "ok",
      });
    });
  }

  it("should apply remove operations to the editor", async () => {
    const startDocLength = editor.document.length;
    const removeOp = {
      operation: {
        type: "delete",
        ids: ["ref1"],
      } as RemoveBlocksOperation,
    };

    const result = await processOperations(createMockStream(removeOp));

    // Should call removeBlocks with the right parameters
    expect(editor.document.length).toBe(startDocLength - 1);
    expect(editor.document[0].id).toEqual("ref2");

    // Should yield the operation with result: "ok"
    expect(result.length).toBe(1);
    expect(result[0]).toEqual({
      lastBlockId: "ref2",
      operation: removeOp.operation,
      result: "ok",
    });
  });

  it("should handle multiple operations in sequence", async () => {
    const startDocLength = editor.document.length;
    const insertOp = {
      operation: {
        type: "add",
        blocks: [{ content: "block1" }],
        referenceId: "ref1",
        position: "after",
      } as InsertBlocksOperation<any>,
    };

    const updateOp = {
      operation: {
        type: "update",
        id: "ref1",
        block: { content: "updated content" },
      } as UpdateBlocksOperation<any>,
    };

    await processOperations(createMockStream(insertOp, updateOp));

    // Should call all the editor methods with the right parameters
    expect(editor.document[1]).toMatchObject({
      content: [{ text: "block1" }],
    });

    expect(editor.document[0]).toMatchObject({
      content: [{ text: "updated content" }],
    });

    expect(editor.document.length).toBe(startDocLength + 1);
  });
});
