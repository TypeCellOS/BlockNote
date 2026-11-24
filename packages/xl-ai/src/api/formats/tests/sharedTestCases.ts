import { Chat, UIMessage } from "@ai-sdk/react";
import { TextSelection } from "prosemirror-state";
import { expect } from "vite-plus/test";
import { AIExtension } from "../../../AIExtension.js";
import { sendMessageWithAIRequest } from "../../../index.js";
import { addOperationTestCases } from "../../../testUtil/cases/addOperationTestCases.js";
import { combinedOperationsTestCases } from "../../../testUtil/cases/combinedOperationsTestCases.js";
import { deleteOperationTestCases } from "../../../testUtil/cases/deleteOperationTestCases.js";
import {
  DocumentOperationTestCase,
  getExpectedEditor,
  type SetupTestEditor,
} from "../../../testUtil/cases/index.js";
import { updateOperationTestCases } from "../../../testUtil/cases/updateOperationTestCases.js";
import { validateRejectingResultsInOriginalDoc } from "../../../testUtil/suggestChangesTestUtil.js";
import { getTestOptionsHost } from "../../../testUtil/testOptions.js";
import { AIRequestHelpers } from "../../../types.js";
import { buildAIRequest } from "../../aiRequest/builder.js";

async function readExpectedDocument(
  setupEditor: SetupTestEditor,
  test: DocumentOperationTestCase,
) {
  // The oracle starts its own deterministic ID sequence. Preserve the
  // sequence of the editor that just replayed the request.
  const options = getTestOptionsHost().__TEST_OPTIONS;
  const replayID = options?.mockID;
  try {
    return (
      await getExpectedEditor(setupEditor, test, {
        deleteEmptyCursorBlock: true,
      })
    ).document;
  } finally {
    if (options) {
      if (replayID === undefined) {
        delete options.mockID;
      } else {
        options.mockID = replayID;
      }
    }
  }
}

export function createExpectedDocumentCache() {
  const documents = new WeakMap<
    DocumentOperationTestCase,
    Awaited<ReturnType<typeof readExpectedDocument>>
  >();

  return async function getExpectedDocument(
    setupEditor: SetupTestEditor,
    test: DocumentOperationTestCase,
  ) {
    const cached = documents.get(test);
    if (cached !== undefined) {
      return structuredClone(cached);
    }

    const document = await readExpectedDocument(setupEditor, test);
    documents.set(test, structuredClone(document));
    return document;
  };
}

export const documentOperationTestGroups = {
  Add: addOperationTestCases,
  Update: updateOperationTestCases,
  Delete: deleteOperationTestCases,
  Combined: combinedOperationsTestCases,
};

export async function runDocumentOperationCase(
  setupEditor: SetupTestEditor,
  test: DocumentOperationTestCase,
  aiOptions: AIRequestHelpers,
  getExpectedDocument = readExpectedDocument,
) {
  const editor = await test.editor(setupEditor);
  const selection = test.getTestSelection?.(editor);

  if (selection) {
    editor.transact((tr) => {
      tr.setSelection(
        TextSelection.create(tr.doc, selection.from, selection.to),
      );
    });
  }

  const originalDoc = editor.transact(({ doc }) => doc);

  const chat = new Chat<UIMessage>({
    sendAutomaticallyWhen: () => false,
    transport: aiOptions.transport,
    onError: (error) => {
      throw error;
    },
  });

  const aiRequest = await buildAIRequest({
    editor,
    useSelection: selection !== undefined,
    streamToolsProvider: aiOptions.streamToolsProvider,
  });

  const result = await sendMessageWithAIRequest(
    chat,
    aiRequest,
    {
      role: "user",
      parts: [
        {
          type: "text",
          text: test.userPrompt,
        },
      ],
    },
    aiOptions.chatRequestOptions,
  );

  expect(chat.status).toBe("ready");
  if (!result.ok) {
    throw new Error("The recorded tool calls failed", { cause: result.error });
  }

  const ai = editor.getExtension(AIExtension);
  if (!ai) {
    throw new Error("The replay editor needs the AI extension");
  }
  const suggestedDoc = editor.transact(({ doc }) => doc);
  expect(suggestedDoc.eq(originalDoc)).toBe(false);
  validateRejectingResultsInOriginalDoc(editor, originalDoc);

  ai.acceptChanges();
  expect(editor.transact(({ doc }) => doc.eq(suggestedDoc))).toBe(false);
  expect(editor.document).toEqual(await getExpectedDocument(setupEditor, test));
}
