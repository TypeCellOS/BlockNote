import { afterAll, afterEach, beforeAll, describe } from "vitest";

import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { getCurrentTest } from "@vitest/runner";
import { getSortedEntries, snapshot, toHashString } from "msw-snapshot";
import { setupServer } from "msw/node";
import path from "path";
import { createBlockNoteAIClient } from "../../blocknoteAIClient/client.js";
import { generateSharedTestCases } from "../tests/sharedTestCases.js";
import { callLLM } from "./markdownBlocks.js";

// Create client and models outside of test suites so they can be shared
const client = createBlockNoteAIClient({
  baseURL: "https://localhost:3000/ai",
  apiKey: "PLACEHOLDER",
});

const groq = createGroq({
  ...client.getProviderSettings("groq"),
})("llama-3.3-70b-versatile");

const openai = createOpenAI({
  ...client.getProviderSettings("openai"),
})("gpt-4o-2024-08-06", {});

const albert = createOpenAI({
  // albert-etalab/neuralmagic/Meta-Llama-3.1-70B-Instruct-FP8
  baseURL: "https://albert.api.etalab.gouv.fr/v1",
  ...client.getProviderSettings("albert-etalab"),
  compatibility: "compatible",
})("neuralmagic/Meta-Llama-3.1-70B-Instruct-FP8");

const BASE_FILE_PATH = path.resolve(
  __dirname,
  "__snapshots__",
  path.basename(__filename)
);

// TODO: disable delays in applyOperations

const fetchCountMap: Record<string, number> = {};

async function createRequestHash(req: Request) {
  const url = new URL(req.url);
  return [
    // url.host,
    // url.pathname,
    toHashString([
      req.method,
      url.origin,
      url.pathname,
      getSortedEntries(url.searchParams),
      getSortedEntries(req.headers),
      // getSortedEntries(req.cookies),
      new TextDecoder("utf-8").decode(await req.arrayBuffer()),
    ]),
  ].join("/");
}

// Main test suite with snapshot middleware
describe("Models", () => {
  // Define server with snapshot middleware for the main tests
  const server = setupServer(
    snapshot({
      updateSnapshots: "missing",
      // onSnapshotUpdated: "all",
      // ignoreSnapshots: true,
      async createSnapshotPath(info) {
        // use a unique path for each model
        const t = getCurrentTest()!;
        const mswPath = path.join(
          t.suite!.name, // same directory as the test snapshot
          "__msw_snapshots__",
          t.suite!.suite!.name, // model / streaming params
          t.name
        );
        // in case there are multiple requests in a test, we need to use a separate snapshot for each request
        fetchCountMap[mswPath] = (fetchCountMap[mswPath] || 0) + 1;
        const hash = await createRequestHash(info.request);
        return mswPath + `_${fetchCountMap[mswPath]}_${hash}.json`;
      },
      basePath: BASE_FILE_PATH,
      // onFetchFromSnapshot(info, snapshot) {
      // console.log("onFetchFromSnapshot", info, snapshot);
      // },
      // onFetchFromServer(info, snapshot) {
      //   console.log("onFetchFromServer", info, snapshot);
      // },
    })
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
      model: albert,
    },

    // {
    //   model: groq,
    // },
    // // {
    // //   model: albert,
    // //   stream: true,
    // // },
  ];

  for (const params of testMatrix) {
    describe(`${params.model.provider}/${params.model.modelId}`, () => {
      generateSharedTestCases((editor, options) =>
        callLLM(editor, {
          ...options,
          model: params.model,
          maxRetries: 0,
          stream: false,
        })
      );
    });
  }
});
