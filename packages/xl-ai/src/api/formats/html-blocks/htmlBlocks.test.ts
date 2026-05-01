import { snapshot } from "msw-snapshot";
import { setupServer } from "msw/node";
import path from "path";
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";
import { testAIModels } from "../../../testUtil/testAIModels.js";

import { BlockNoteEditor } from "@blocknote/core";
import { StreamToolExecutor } from "../../../streamTool/StreamToolExecutor.js";
import { ClientSideTransport } from "../../../streamTool/vercelAiSdk/clientside/ClientSideTransport.js";
import { createSnapshotPathFn } from "../tests/snapshotPath.js";
import { generateSharedTestCases } from "../tests/sharedTestCases.js";
import { htmlBlockLLMFormat } from "./htmlBlocks.js";

const BASE_FILE_PATH = path.resolve(
  __dirname,
  "__snapshots__",
  path.basename(__filename),
);

// Main test suite with snapshot middleware
describe("Models", () => {
  // Define server with snapshot middleware for the main tests
  const server = setupServer(
    snapshot({
      updateSnapshots: "missing",
      createSnapshotPath: createSnapshotPathFn(BASE_FILE_PATH),
      basePath: BASE_FILE_PATH,
    }),
  );

  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  afterEach(() => {
    delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
  });

  const testMatrix = [
    {
      model: testAIModels.openai,
      stream: true,
    },
    // {
    //   model: testAIModels.openai,
    //   stream: false,
    // },
    // TODO: https://github.com/vercel/ai/issues/8533
    {
      model: testAIModels.groq,
      stream: true,
    },
    // {
    //   model: testAIModels.groq,
    //   stream: false,
    // },
    // anthropic streaming needs further investigation for some test cases
    // {
    //   model: testAIModels.anthropic,
    //   stream: true,
    // },
    {
      model: testAIModels.anthropic,
      stream: true,
    },
    // currently doesn't support streaming
    // https://github.com/vercel/ai/issues/5350
    // {
    //   model: testAIModels.albert,
    //   stream: true,
    // },
    // This works for most prompts, but not all (would probably need a llama upgrade?)
    // {
    //   model: testAIModels.albert,
    //   stream: false,
    // },
  ];

  for (const params of testMatrix) {
    describe(`${params.model.provider}/${params.model.modelId} (${
      params.stream ? "streaming" : "non-streaming"
    })`, () => {
      generateSharedTestCases({
        streamToolsProvider: htmlBlockLLMFormat.getStreamToolsProvider({
          withDelays: false,
        }),
        transport: new ClientSideTransport({
          systemPrompt: htmlBlockLLMFormat.systemPrompt,
          model: params.model,
          stream: params.stream,
          _additionalOptions: {
            maxRetries: 0,
          },
        }),
      });
    });
  }
});

describe("streamToolsProvider", () => {
  it("should return the correct stream tools", () => {
    // test skipped, this is only to validate type inference
    return;

    // eslint-disable-next-line no-unreachable
    const editor = BlockNoteEditor.create();
    const streamTools = htmlBlockLLMFormat
      .getStreamToolsProvider({
        defaultStreamTools: {
          add: true,
        },
      })
      .getStreamTools(editor, true);

    const executor = new StreamToolExecutor(streamTools);

    executor.executeOne({
      type: "add",
      blocks: ["<p>test</p>"],
      referenceId: "1",
      position: "after",
    });

    executor.executeOne({
      // @ts-expect-error
      type: "update",
      blocks: ["<p>test</p>"],
      referenceId: "1",
      position: "after",
    });

    executor.executeOne({
      type: "add",
      // @ts-expect-error
      blocks: [{ type: "paragraph", content: "test" }],
      referenceId: "1",
      position: "after",
    });
  });
});
