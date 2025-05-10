import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vitest";
import { getAIExtension } from "../../../../AIExtension.js";
import { addOperationTestCases } from "../../../../testUtil/cases/AddOperationTestCases.js";
import { combinedOperationsTestCases } from "../../../../testUtil/cases/combinedOperationsTestCases.js";
import { deleteOperationTestCases } from "../../../../testUtil/cases/deleteOperationTestCases.js";
import {
  DocumentOperationTestCase,
  getExpectedEditor,
} from "../../../../testUtil/cases/types.js";
import { updateOperationTestCases } from "../../../../testUtil/cases/updateOperationTestCases.js";
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
async function executeTestCase(
  editor: BlockNoteEditor<any, any, any>,
  testCase: DocumentOperationTestCase,
) {
  const streamTools = [
    tools.add(editor, { idsSuffixed: true, withDelays: false }),
    tools.update(editor, {
      idsSuffixed: true,
      withDelays: false,
      updateSelection: testCase.getTestSelection?.(editor),
    }),
    tools.delete(editor, { idsSuffixed: true, withDelays: false }),
  ];

  const stream = createMockStream(
    ...testCase.baseToolCalls.map((u) => ({ operation: u })),
  );

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

describe("Add", () => {
  for (const testCase of addOperationTestCases) {
    it(testCase.description, async () => {
      const editor = testCase.editor();

      await executeTestCase(editor, testCase);

      expect(editor.document).toEqual(getExpectedEditor(testCase).document);
    });
  }
});

describe("Update", () => {
  for (const testCase of updateOperationTestCases) {
    it(testCase.description, async () => {
      const editor = testCase.editor();

      await executeTestCase(editor, testCase);

      expect(editor.document).toEqual(getExpectedEditor(testCase).document);
    });
  }
});

describe("Delete", () => {
  for (const testCase of deleteOperationTestCases) {
    it(testCase.description, async () => {
      const editor = testCase.editor();
      const startDocLength = editor.document.length;
      await executeTestCase(editor, testCase);

      expect(editor.document.length).toBe(
        startDocLength - testCase.baseToolCalls.length,
      );
      expect(editor.document).toEqual(getExpectedEditor(testCase).document);
    });
  }
});

describe("Combined", () => {
  for (const testCase of combinedOperationsTestCases) {
    it(testCase.description, async () => {
      const editor = testCase.editor();

      await executeTestCase(editor, testCase);

      expect(editor.document).toEqual(getExpectedEditor(testCase).document);
    });
  }
});
