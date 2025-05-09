import {
  BlockNoteEditor,
  prosemirrorSliceToSlicedBlocks,
} from "@blocknote/core";
import { partialBlockToBlockForTesting } from "@shared/formatConversionTestUtil.js";
import { describe, expect, it } from "vitest";
import { getAIExtension } from "../../../../AIExtension.js";
import {
  getTestEditor,
  updateOperationTestCases,
} from "../../../../testUtil/cases/updateOperationTestCases.js";
import { createAsyncIterableStreamFromAsyncIterable } from "../../../util/stream.js";
import { AddBlocksToolCall } from "../../base-tools/createAddBlocksTool.js";
import { UpdateBlockToolCall } from "../../base-tools/createUpdateBlockTool.js";
import { DeleteBlockToolCall } from "../../base-tools/delete.js";
import { CallLLMResult } from "../../CallLLMResult.js";
import { tools } from "./index.js";

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
  }>,
  selection?: {
    from: number;
    to: number;
  },
) {
  // TODO: idsSuffixed
  const streamTools = [
    tools.add(editor, { idsSuffixed: true, withDelays: false }),
    tools.update(editor, {
      idsSuffixed: true,
      withDelays: false,
      updateSelection: selection,
    }),
    tools.delete(editor, { idsSuffixed: true, withDelays: false }),
  ];

  const result = new CallLLMResult(
    {
      operationsSource: createAsyncIterableStreamFromAsyncIterable(stream),
      streamObjectResult: undefined,
      generateObjectResult: undefined,
    },
    streamTools,
  );

  await result.execute();

  await getAIExtension(editor).acceptChanges();

  return result;
}

describe("JSON Tools", () => {
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

    await processOperations(editor, createMockStream(insertOp));

    // Should call insertBlocks with the right parameters
    expect(editor.document[1]).toMatchObject({
      content: [{ text: "block1" }],
    });
  });

  for (const testCase of updateOperationTestCases) {
    // eslint-disable-next-line no-loop-func
    it(`should apply update operations to the editor (${testCase.description})`, async () => {
      // TODO: quite some code duplicated here from other tests

      const editor = testCase.editor();
      const selection = testCase.getTestSelection?.(editor);

      await processOperations(
        editor,
        createMockStream({ operation: testCase.updateOp }),
        selection,
      );

      // Should call updateBlock with the right parameters
      const update = testCase.updateOp.block;
      let block = editor.getBlock(testCase.updateOp.id)!;
      if (selection) {
        const selectionInfo = prosemirrorSliceToSlicedBlocks(
          editor.prosemirrorState.doc.slice(selection.from, selection.to, true),
          editor.pmSchema,
        );
        block = selectionInfo.blocks[0];
      }
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
            .content,
        );
      }
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

    await processOperations(editor, createMockStream(removeOp));

    // Should call removeBlocks with the right parameters
    expect(editor.document.length).toBe(startDocLength - 1);
    expect(editor.document[0].id).toEqual("ref2");
  });

  it("should handle multiple operations in sequence", async () => {
    const editor = getTestEditor();
    const startDocLength = editor.document.length;
    const insertOp = {
      operation: {
        type: "add",
        blocks: [{ content: "block1" }],
        referenceId: "ref1",
        position: "before",
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
    expect(editor.document[0]).toMatchObject({
      content: [{ text: "block1" }],
    });

    expect(editor.document[1]).toMatchObject({
      content: [{ text: "updated content" }],
    });

    expect(editor.document.length).toBe(startDocLength + 1);
  });

  it("should handle multiple operations in sequence with selection", async () => {
    // (this test validates whether the position mapper of the selection works correctly)
    const editor = getTestEditor();
    const startDocLength = editor.document.length;
    const insertOp = {
      operation: {
        type: "add",
        blocks: [{ content: "block1" }],
        referenceId: "ref1",
        position: "before",
      } as AddBlocksToolCall<any>,
    };

    const updateOp = updateOperationTestCases.filter(
      (t) => t.description === "translate selection",
    )[0];

    await processOperations(
      editor,
      createMockStream(insertOp, {
        operation: updateOp.updateOp,
      }),
      updateOp.getTestSelection?.(editor),
    );

    // Should call all the editor methods with the right parameters
    expect(editor.document[0]).toMatchObject({
      content: [{ text: "block1" }],
    });

    expect((editor.document[2].content as any).length).toBeGreaterThan(1);
    expect((editor.document[2].content as any)[0]).toMatchObject({
      text: "Hallo, ",
    });

    expect(editor.document.length).toBe(startDocLength + 1);
  });
});
