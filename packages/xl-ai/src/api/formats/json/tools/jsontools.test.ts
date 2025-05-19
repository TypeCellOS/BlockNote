/* eslint-disable jest/valid-title */
import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vitest";
import { addOperationTestCases } from "../../../../testUtil/cases/addOperationTestCases.js";
import { combinedOperationsTestCases } from "../../../../testUtil/cases/combinedOperationsTestCases.js";
import { deleteOperationTestCases } from "../../../../testUtil/cases/deleteOperationTestCases.js";
import { DocumentOperationTestCase } from "../../../../testUtil/cases/index.js";
import { updateOperationTestCases } from "../../../../testUtil/cases/updateOperationTestCases.js";
import { createAsyncIterableStreamFromAsyncIterable } from "../../../../util/stream.js";
import { LLMResponse } from "../../../LLMResponse.js";
import { AddBlocksToolCall } from "../../base-tools/createAddBlocksTool.js";
import { UpdateBlockToolCall } from "../../base-tools/createUpdateBlockTool.js";
import { DeleteBlockToolCall } from "../../base-tools/delete.js";
import { tools } from "./index.js";

// Helper function to create a mock stream from operations
import { getAIExtension } from "../../../../AIExtension.js";
import { getExpectedEditor } from "../../../../testUtil/cases/index.js";
import { validateRejectingResultsInOriginalDoc } from "../../../../testUtil/suggestChangesTestUtil.js";
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
  const originalDoc = editor.prosemirrorState.doc;
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

  // bit hacky way to instantiate an LLMResponse just so we can call execute
  const result = new LLMResponse(
    undefined as any,
    {
      operationsSource: createAsyncIterableStreamFromAsyncIterable(stream),
      streamObjectResult: undefined,
      generateObjectResult: undefined,
      getGeneratedOperations: undefined as any,
    },
    streamTools,
  );

  await result.execute();

  validateRejectingResultsInOriginalDoc(editor, originalDoc);

  getAIExtension(editor).acceptChanges();
  expect(editor.document).toEqual(getExpectedEditor(testCase).document);

  return result;
}

describe("Add", () => {
  for (const testCase of addOperationTestCases) {
    it(testCase.description, async () => {
      const editor = testCase.editor();

      await executeTestCase(editor, testCase);
    });
  }
});

describe("Update", () => {
  for (const testCase of updateOperationTestCases) {
    it(testCase.description, async () => {
      const editor = testCase.editor();

      await executeTestCase(editor, testCase);
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
    });
  }
});

describe("Combined", () => {
  for (const testCase of combinedOperationsTestCases) {
    it(testCase.description, async () => {
      const editor = testCase.editor();

      await executeTestCase(editor, testCase);
    });
  }
});
