import { createAnthropic } from "@ai-sdk/anthropic";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { defaultSettingsMiddleware, wrapLanguageModel } from "ai";
import { describe, expect } from "vite-plus/test";
import { ClientSideTransport } from "../../../streamTool/vercelAiSdk/clientside/ClientSideTransport.js";
import {
  createExpectedDocumentCache,
  documentOperationTestGroups,
  runDocumentOperationCase,
} from "../tests/sharedTestCases.js";
import { htmlBlockLLMFormat } from "./htmlBlocks.js";

type Recording = {
  request: { method: string; url: string; body: string };
  response: {
    status: number;
    statusText: string;
    body: string;
    headers: [string, string][];
  };
};

const recordingPrefix = "./__snapshots__/htmlBlocks.test.ts/";
const recordings = import.meta.glob<Recording>(
  "./__snapshots__/htmlBlocks.test.ts/**/*.json",
  { import: "default" },
);

// The recordings were made with MSW in Node. Replay the same provider response
// in the browser without a service worker, network access, or provider secrets.
const recordedRequests = Object.entries(recordings).map(
  ([path, load]) =>
    [
      path.slice(recordingPrefix.length).replace(/_1_[a-f0-9]{32}\.json$/, ""),
      load,
    ] as const,
);
const loadRecording = new Map(recordedRequests);

function recordingKey(group: string, model: string, description: string) {
  return `${group}/__msw_snapshots__/${model} (streaming)/${description}`;
}

function canonicalizeRequestBody(body: string): unknown {
  // The prompt embeds JSON-encoded HTML. CSSOM adds `style` before other
  // attributes in jsdom and after them in browsers. Ignore only attribute
  // ordering: tag names, attribute values, text, and the prompt still match.
  const attribute = / [\w:-]+=(?:"[^"]*"|\\"[^"]*\\")/.source;
  const openingTag = new RegExp(`(<[\\w-]+)((?:${attribute})+)(/?>)`, "g");
  return JSON.parse(body, (_key, value: unknown) =>
    typeof value === "string"
      ? value.replace(
          openingTag,
          (_whole, tag: string, attributes: string, end: string) =>
            tag +
            (attributes.match(new RegExp(attribute, "g")) ?? [])
              .sort()
              .join("") +
            end,
        )
      : value,
  );
}

describe("Models", () => {
  const providers = [
    {
      name: "openai.responses/gpt-4o-2024-08-06",
      createModel: (fetch: typeof globalThis.fetch) =>
        createOpenAI({ apiKey: "fixture-only", fetch })("gpt-4o-2024-08-06"),
    },
    {
      name: "groq.chat/llama-3.3-70b-versatile",
      createModel: (fetch: typeof globalThis.fetch) =>
        createGroq({ apiKey: "fixture-only", fetch })(
          "llama-3.3-70b-versatile",
        ),
    },
    {
      name: "anthropic.messages/claude-3-7-sonnet-latest",
      createModel: (fetch: typeof globalThis.fetch) =>
        wrapLanguageModel({
          model: createAnthropic({ apiKey: "fixture-only", fetch })(
            "claude-3-7-sonnet-latest",
          ),
          // Keep the limit used by the original recordings.
          middleware: defaultSettingsMiddleware({
            settings: { maxOutputTokens: 4096 },
          }),
        }),
    },
  ];
  const groups = Object.entries(documentOperationTestGroups);

  it("matches the recorded requests to the replay matrix one-to-one", () => {
    const expectedKeys = providers.flatMap(({ name }) =>
      groups.flatMap(([group, tests]) =>
        tests.map(({ description }) => recordingKey(group, name, description)),
      ),
    );
    expect(new Set(expectedKeys).size).toBe(expectedKeys.length);
    expect(recordedRequests.map(([key]) => key).sort()).toEqual(
      expectedKeys.sort(),
    );
  });

  // Share plain oracle documents, not editors or request state, across providers.
  const getExpectedDocument = createExpectedDocumentCache();
  for (const { name, createModel } of providers) {
    describe(`${name} (streaming)`, () => {
      for (const [group, tests] of groups) {
        describe(`${group}`, () => {
          for (const test of tests) {
            it(`${test.description}`, async ({ setupEditor }) => {
              const key = recordingKey(group, name, test.description);
              const load = loadRecording.get(key);
              if (!load) {
                throw new Error(`No provider recording for ${key}`);
              }
              let requests = 0;
              const replayFetch: typeof fetch = async (input, init) => {
                if (++requests !== 1) {
                  throw new Error(`Unexpected request ${requests} for ${key}`);
                }
                const recording = await load();
                const request = new Request(input, init);
                expect.soft(request.method).toBe(recording.request.method);
                expect.soft(request.url).toBe(recording.request.url);
                expect
                  .soft(canonicalizeRequestBody(await request.text()))
                  .toEqual(canonicalizeRequestBody(recording.request.body));
                return new Response(
                  recording.response.body,
                  recording.response,
                );
              };
              await runDocumentOperationCase(
                setupEditor,
                test,
                {
                  streamToolsProvider:
                    htmlBlockLLMFormat.getStreamToolsProvider({
                      withDelays: false,
                    }),
                  transport: new ClientSideTransport({
                    systemPrompt: htmlBlockLLMFormat.systemPrompt,
                    model: createModel(replayFetch),
                    stream: true,
                    _additionalOptions: { maxRetries: 0 },
                  }),
                },
                getExpectedDocument,
              );
              expect(requests, `Requests for ${key}`).toBe(1);
            });
          }
        });
      }
    });
  }
});
