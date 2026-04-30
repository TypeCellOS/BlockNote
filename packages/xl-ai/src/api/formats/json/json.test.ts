import { afterAll, afterEach, beforeAll, describe } from "vitest";

import { snapshot } from "msw-snapshot";
import { setupServer } from "msw/node";
import path from "path";
import { createSnapshotPathFn } from "../tests/snapshotPath.js";
import { generateSharedTestCases } from "../tests/sharedTestCases.js";

import { ClientSideTransport } from "../../../streamTool/vercelAiSdk/clientside/ClientSideTransport.js";
import { testAIModels } from "../../../testUtil/testAIModels.js";
import { aiDocumentFormats } from "../../index.js";

const BASE_FILE_PATH = path.resolve(
  __dirname,
  "__snapshots__",
  path.basename(__filename),
);

// Main test suite with snapshot middleware
describe.skip("Models", () => {
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
    // this model doesn't work well with json format
    // {
    //   model: testAIModels.groq,
    //   stream: true,
    // },
    // {
    //   model: testAIModels.groq,
    //   stream: false,
    // },
    // this model doesn't work well with json format
    // {
    //   model: albert,
    //   stream: true,
    // },
    // {
    //   model: albert,
    //   stream: false,
    // },
  ];

  for (const params of testMatrix) {
    describe(`${params.model.provider}/${params.model.modelId} (${
      params.stream ? "streaming" : "non-streaming"
    })`, () => {
      generateSharedTestCases({
        streamToolsProvider:
          aiDocumentFormats._experimental_json.getStreamToolsProvider({
            withDelays: false,
          }),
        transport: new ClientSideTransport({
          systemPrompt: aiDocumentFormats._experimental_json.systemPrompt,
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
