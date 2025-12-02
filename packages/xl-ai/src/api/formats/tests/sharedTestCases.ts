import { Chat, UIMessage } from "@ai-sdk/react";
import { BlockNoteEditor } from "@blocknote/core";
import { getCurrentTest, TaskContext } from "@vitest/runner";
import path from "path";
import { TextSelection } from "prosemirror-state";
import { describe, expect, it } from "vitest";
import { AIExtension } from "../../../AIExtension.js";
import { sendMessageWithAIRequest } from "../../../index.js";
import { addOperationTestCases } from "../../../testUtil/cases/addOperationTestCases.js";
import { combinedOperationsTestCases } from "../../../testUtil/cases/combinedOperationsTestCases.js";
import { deleteOperationTestCases } from "../../../testUtil/cases/deleteOperationTestCases.js";
import {
  DocumentOperationTestCase,
  getExpectedEditor,
} from "../../../testUtil/cases/index.js";
import { updateOperationTestCases } from "../../../testUtil/cases/updateOperationTestCases.js";
import { validateRejectingResultsInOriginalDoc } from "../../../testUtil/suggestChangesTestUtil.js";
import { AIRequestHelpers } from "../../../types.js";
import { buildAIRequest } from "../../aiRequest/builder.js";

const BASE_FILE_PATH = path.resolve(__dirname, "__snapshots__");

// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function matchFileSnapshot(data: any, postFix = "") {
  const t = getCurrentTest()!;
  // this uses the same snapshot path, regardless of the model / streaming params
  await expect(data).toMatchFileSnapshot(
    path.resolve(
      BASE_FILE_PATH,
      t.suite!.name,
      t.name + (postFix ? `_${postFix}` : "") + ".json",
    ),
  );
}

export function generateSharedTestCases(
  aiOptions: AIRequestHelpers,
  skipTestsRequiringCapabilities?: {
    mentions?: boolean;
    textAlignment?: boolean;
    blockColor?: boolean;
  },
) {
  function skipIfUnsupported(
    test: DocumentOperationTestCase,
    context: TaskContext,
  ) {
    if (
      skipTestsRequiringCapabilities &&
      Object.keys(test.requiredCapabilities || {}).some(
        (c) =>
          skipTestsRequiringCapabilities[
            c as keyof typeof skipTestsRequiringCapabilities
          ] === true,
      )
    ) {
      context.skip();
    }
  }

  async function executeTestCase(
    editor: BlockNoteEditor<any, any, any>,
    test: DocumentOperationTestCase,
  ) {
    const selection = test.getTestSelection?.(editor);

    if (selection) {
      editor.transact((tr) => {
        tr.setSelection(
          TextSelection.create(tr.doc, selection.from, selection.to),
        );
      });
    }

    const originalDoc = editor.prosemirrorState.doc;

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

    await sendMessageWithAIRequest(
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

    if (chat.status !== "ready") {
      throw new Error(`Chat status is not "ready": ${chat.status}`);
    }

    // const result = await callLLM(editor, {
    //   userPrompt: test.userPrompt,
    //   useSelection: selection !== undefined,
    // });

    // await result._logToolCalls();
    // await result.execute();

    // the prosemirrorState has all details with suggested changes
    // This can be used for snapshots, but currently we've disabled this as there can
    // be small differences between for example streaming and non-streaming results in the
    // granularity of the suggested changes. Can be enabled for debugging:

    // await matchFileSnapshot(editor.prosemirrorState.doc.toJSON());
    // console.log(JSON.stringify(editor.prosemirrorState.doc.toJSON(), null, 2));
    validateRejectingResultsInOriginalDoc(editor, originalDoc);

    // we first need to accept changes to get the correct result
    editor.getExtension(AIExtension)?.acceptChanges();
    expect(editor.document).toEqual(
      getExpectedEditor(test, {
        deleteEmptyCursorBlock: true,
      }).document,
    );
  }

  describe("Add", () => {
    for (const test of addOperationTestCases) {
      it(test.description, async (c) => {
        skipIfUnsupported(test, c);

        const editor = test.editor();

        await executeTestCase(editor, test);
      });
    }
  });

  describe("Update", () => {
    for (const test of updateOperationTestCases) {
      it(test.description, async (c) => {
        skipIfUnsupported(test, c);

        const editor = test.editor();

        await executeTestCase(editor, test);
      });
    }
  });

  describe("Delete", () => {
    for (const test of deleteOperationTestCases) {
      it(test.description, async (c) => {
        skipIfUnsupported(test, c);

        const editor = test.editor();

        await executeTestCase(editor, test);
      });
    }
  });

  describe("Combined", () => {
    for (const test of combinedOperationsTestCases) {
      it(test.description, async (c) => {
        skipIfUnsupported(test, c);

        const editor = test.editor();

        await executeTestCase(editor, test);
      });
    }
  });
}
