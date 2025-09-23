import { getCurrentTest } from "@vitest/runner";
import { getSortedEntries, snapshot, toHashString } from "msw-snapshot";
import { setupServer } from "msw/node";
import path from "path";
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";
import { testAIModels } from "../../../testUtil/testAIModels.js";

import { BlockNoteEditor } from "@blocknote/core";
import { StreamToolExecutor } from "../../../streamTool/StreamToolExecutor.js";
import { ClientSideTransport } from "../../../streamTool/vercelAiSdk/clientside/ClientSideTransport.js";
import { generateSharedTestCases } from "../tests/sharedTestCases.js";
import { htmlBlockLLMFormat } from "./htmlBlocks.js";

const BASE_FILE_PATH = path.resolve(
  __dirname,
  "__snapshots__",
  path.basename(__filename),
);

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
          t.name,
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
      generateObject: true,
    },
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
      (params.stream ? "streaming" : "non-streaming") +
      (params.generateObject ? " + generateObject" : "")
    })`, () => {
      generateSharedTestCases(
        {
          streamToolsProvider: htmlBlockLLMFormat.getStreamToolsProvider({
            withDelays: false,
          }),
          transport: new ClientSideTransport({
            model: params.model,
            stream: params.stream,
            objectGeneration: params.generateObject,
            _additionalOptions: {
              maxRetries: 0,
            },
          }),
        },
        // TODO: remove when matthew's parsing PR is merged
        {
          textAlignment: true,
          blockColor: true,
        },
      );
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
