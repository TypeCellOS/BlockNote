import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { Chat } from "@ai-sdk/react";
import type { BlockNoteEditor } from "@blocknote/core";
import {
  type LanguageModelMiddleware,
  type UIMessage,
  wrapLanguageModel,
} from "ai";
import { writeFileSync } from "node:fs";
import { TextSelection } from "prosemirror-state";
import { afterAll, describe, it } from "vite-plus/test";

import { AIExtension } from "../../AIExtension.js";
import { buildAIRequest } from "../../api/aiRequest/builder.js";
import { sendMessageWithAIRequest } from "../../api/aiRequest/sendMessageWithAIRequest.js";
import { htmlBlockLLMFormat } from "../../api/formats/html-blocks/htmlBlocks.js";
import { ClientSideTransport } from "../../streamTool/vercelAiSdk/clientside/ClientSideTransport.js";
import { addOperationTestCases } from "../../testUtil/cases/addOperationTestCases.js";
import { deleteOperationTestCases } from "../../testUtil/cases/deleteOperationTestCases.js";
import {
  type DocumentOperationTestCase,
  getExpectedEditor,
} from "../../testUtil/cases/index.js";
import { updateOperationTestCases } from "../../testUtil/cases/updateOperationTestCases.js";
import { runDocumentAgent } from "../agent/documentAgent.js";
import { toolCallsOf, toolCallsOfBlocks } from "../proposal/derive.js";
import {
  createProposal,
  headlessEditorFactory,
  openProposal,
} from "../proposal/proposal.js";
import { createInMemoryProposalStore } from "../stores/proposalStore.js";
import { createProposalDocument } from "../proposal/proposalDocument.js";

// A comparison of the document agent with the `html-blocks` format of the
// old engine, on some LLM test cases of the old engine, with a real model.
//
// The normal test run skips this file: it makes LLM calls. Run it with
//   DOCUMENT_AGENT_LIVE=1 DOCUMENT_AGENT_MODEL=anthropic:claude-haiku-5-5 \
//   vp test --run src/documentAgent/comparison
// and the API key of the provider in the environment. The results go to the
// file in DOCUMENT_AGENT_RESULTS (JSON), if it is set. DOCUMENT_AGENT_CASES
// selects other cases (the descriptions, with `|` between them), and prints
// the document of each case of the document agent that does not pass.
//
// A case passes if the document after the run is the expected document of
// the old test case. Block IDs do not count.

const live = process.env.DOCUMENT_AGENT_LIVE === "1";
const modelName =
  process.env.DOCUMENT_AGENT_MODEL ?? "anthropic:claude-haiku-5-5";

/** The descriptions of the old test cases to run. */
const SELECTED = new Set([
  "standard update",
  "fix spelling mid-word selection",
  "update block type",
  "update block prop",
  "styles + ic in source block, remove mark",
  "styles + ic in target block, add mark (word)",
  "drop mark and link",
  "update table cell",
  "remove column",
  "turn paragraphs into list",
  "modify nested content",
  "clear block formatting",
  "add a new paragraph (end)",
  "add a list (end)",
  "delete first block",
]);

const cases = [
  ...updateOperationTestCases,
  ...addOperationTestCases,
  ...deleteOperationTestCases,
].filter((testCase) =>
  process.env.DOCUMENT_AGENT_CASES === undefined
    ? SELECTED.has(testCase.description)
    : process.env.DOCUMENT_AGENT_CASES.split("|").includes(
        testCase.description,
      ),
);

type Usage = { calls: number; inputTokens: number; outputTokens: number };

type Result = {
  case: string;
  engine: "document-agent" | "html-blocks";
  model: string;
  pass: boolean;
  /** A run that threw, for example an error of the provider. */
  failed: boolean;
  ms: number;
  usage: Usage;
  toolCalls?: number;
  /** The blocks that more than one tool call changed. */
  sharedBlocks?: number;
};

const results: Result[] = [];

/** The model of the comparison, with a middleware that counts the LLM calls and the tokens. */
function countedModel(usage: Usage) {
  const separator = modelName.indexOf(":");
  const provider = modelName.slice(0, separator);
  const modelId = modelName.slice(separator + 1);
  const model =
    provider === "openai"
      ? createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(modelId)
      : createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })(modelId);
  const middleware: LanguageModelMiddleware = {
    specificationVersion: "v4",
    wrapGenerate: async ({ doGenerate }) => {
      const result = await doGenerate();
      usage.calls++;
      usage.inputTokens += result.usage.inputTokens.total ?? 0;
      usage.outputTokens += result.usage.outputTokens.total ?? 0;
      return result;
    },
    wrapStream: async ({ doStream }) => {
      const { stream, ...rest } = await doStream();
      usage.calls++;
      return {
        ...rest,
        stream: stream.pipeThrough(
          new TransformStream({
            transform(chunk, controller) {
              if (chunk.type === "finish") {
                usage.inputTokens += chunk.usage.inputTokens.total ?? 0;
                usage.outputTokens += chunk.usage.outputTokens.total ?? 0;
              }
              controller.enqueue(chunk);
            },
          }),
        ),
      };
    },
  };
  return wrapLanguageModel({ model, middleware });
}

/** The blocks without their IDs: a new block has a different ID in each run. */
function withoutIds(blocks: unknown): unknown {
  return JSON.parse(
    JSON.stringify(blocks, (key, value: unknown) =>
      key === "id" ? undefined : value,
    ),
  );
}

function sameDocument(actual: unknown, expected: unknown): boolean {
  return (
    JSON.stringify(withoutIds(actual)) === JSON.stringify(withoutIds(expected))
  );
}

/** Sets the selection of the test case, and returns the selected text. */
function select(
  editor: BlockNoteEditor<any, any, any>,
  testCase: DocumentOperationTestCase,
): string {
  const selection = testCase.getTestSelection?.(editor);
  if (selection === undefined) {
    return "";
  }
  editor.transact((tr) => {
    tr.setSelection(TextSelection.create(tr.doc, selection.from, selection.to));
  });
  return editor.getSelectedText();
}

/** Runs the document agent on the document of the test case, and returns the proposal document. */
async function runAgent(testCase: DocumentOperationTestCase, usage: Usage) {
  const editor = testCase.editor();
  const selected = select(editor, testCase);
  const createEditor = headlessEditorFactory({ schema: editor.schema });
  const store = createInMemoryProposalStore();
  await store.save("run", createProposal(editor.document));
  const handle = createProposalDocument({
    store,
    proposalId: "run",
    createEditor,
  });
  await runDocumentAgent(
    handle,
    selected === ""
      ? testCase.userPrompt
      : `${testCase.userPrompt}\n\nThe user selected this text of the document. Apply the request to this part only:\n"""\n${selected}\n"""`,
    { model: countedModel(usage), maxOutputTokens: 8000 },
  );
  const proposal = (await store.load("run"))!;
  return {
    document: openProposal(createEditor, proposal).editor.document,
    toolCalls: toolCallsOf(proposal).length,
    sharedBlocks: [...toolCallsOfBlocks(proposal).values()].filter(
      (calls) => calls.length > 1,
    ).length,
  };
}

/** Runs the old engine with the `html-blocks` format, and returns the document after the accept. */
async function runHtmlBlocks(
  testCase: DocumentOperationTestCase,
  usage: Usage,
) {
  const editor = testCase.editor();
  const selected = select(editor, testCase);
  const chat = new Chat<UIMessage>({
    sendAutomaticallyWhen: () => false,
    transport: new ClientSideTransport({
      systemPrompt: htmlBlockLLMFormat.systemPrompt,
      model: countedModel(usage),
      stream: true,
      _additionalOptions: { maxRetries: 0 },
    }),
  });
  const aiRequest = await buildAIRequest({
    editor,
    useSelection: selected !== "",
    streamToolsProvider: htmlBlockLLMFormat.getStreamToolsProvider({
      withDelays: false,
    }),
  });
  await sendMessageWithAIRequest(chat, aiRequest, {
    role: "user",
    parts: [{ type: "text", text: testCase.userPrompt }],
  });
  if (chat.status !== "ready") {
    throw new Error(`The chat status is ${chat.status}`);
  }
  editor.getExtension(AIExtension)?.acceptChanges();
  return { document: editor.document };
}

describe.skipIf(!live)(`live comparison (${modelName})`, () => {
  afterAll(() => {
    // eslint-disable-next-line no-console
    console.table(
      results.map(({ usage, ...result }) => ({ ...result, ...usage })),
    );
    if (process.env.DOCUMENT_AGENT_RESULTS !== undefined) {
      writeFileSync(
        process.env.DOCUMENT_AGENT_RESULTS,
        JSON.stringify(results, null, 2),
      );
    }
  });

  for (const testCase of cases) {
    for (const engine of ["document-agent", "html-blocks"] as const) {
      // A failed case is a result of the comparison, not a failed test.
      it(
        `${testCase.description} (${engine})`,
        { timeout: 120_000 },
        async () => {
          const usage: Usage = { calls: 0, inputTokens: 0, outputTokens: 0 };
          const started = performance.now();
          const expected = getExpectedEditor(testCase, {
            deleteEmptyCursorBlock: engine === "html-blocks",
          }).document;
          const result: Result = {
            case: testCase.description,
            engine,
            model: modelName,
            pass: false,
            failed: false,
            ms: 0,
            usage,
          };
          try {
            if (engine === "document-agent") {
              const run = await runAgent(testCase, usage);
              result.pass = sameDocument(run.document, expected);
              if (
                !result.pass &&
                process.env.DOCUMENT_AGENT_CASES !== undefined
              ) {
                // eslint-disable-next-line no-console
                console.log(
                  JSON.stringify(
                    {
                      actual: withoutIds(run.document),
                      expected: withoutIds(expected),
                    },
                    null,
                    1,
                  ),
                );
              }
              result.toolCalls = run.toolCalls;
              result.sharedBlocks = run.sharedBlocks;
            } else {
              const run = await runHtmlBlocks(testCase, usage);
              result.pass = sameDocument(run.document, expected);
            }
          } catch (error) {
            result.failed = true;
            // eslint-disable-next-line no-console
            console.error(`${testCase.description} (${engine}) threw`, error);
          }
          result.ms = Math.round(performance.now() - started);
          results.push(result);
        },
      );
    }
  }
});
