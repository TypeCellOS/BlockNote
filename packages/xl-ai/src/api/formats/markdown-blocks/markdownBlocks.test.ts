import { afterAll, afterEach, beforeAll, describe } from "vitest";

import { snapshot } from "msw-snapshot";
import { setupServer } from "msw/node";
import path from "path";

import { ClientSideTransport } from "../../../streamTool/vercelAiSdk/clientside/ClientSideTransport.js";
import { testAIModels } from "../../../testUtil/testAIModels.js";
import { aiDocumentFormats } from "../../index.js";
import { generateSharedTestCases } from "../tests/sharedTestCases.js";
import { createSnapshotPathFn } from "../tests/snapshotPath.js";

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
    {
      model: testAIModels.openai,
      stream: false,
    },
    {
      model: testAIModels.groq,
      stream: true,
    },
    {
      model: testAIModels.groq,
      stream: false,
    },
    {
      model: testAIModels.albert,
      stream: true,
    },
    {
      model: testAIModels.albert,
      stream: false,
    },
  ];

  for (const params of testMatrix) {
    // SKIP: prefer html blocks over markdown blocks for now
    describe.skip(`${params.model.provider}/${params.model.modelId} (${
      params.stream ? "streaming" : "non-streaming"
    })`, () => {
      generateSharedTestCases(
        {
          streamToolsProvider:
            aiDocumentFormats._experimental_markdown.getStreamToolsProvider({
              withDelays: false,
            }),
          transport: new ClientSideTransport({
            systemPrompt: aiDocumentFormats._experimental_markdown.systemPrompt,
            model: params.model,
            stream: params.stream,

            _additionalOptions: {
              maxRetries: 0,
            },
          }),
        },
        // markdownblocks doesn't support these:
        {
          mentions: true,
          textAlignment: true,
        },
      );
    });
  }
});
