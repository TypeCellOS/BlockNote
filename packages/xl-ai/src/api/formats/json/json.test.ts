import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { BlockNoteEditor, PartialBlock } from "@blocknote/core";

import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { HttpResponse, http } from "msw";
import { snapshot } from "msw-snapshot";
import { setupServer } from "msw/node";
import path from "path";
import { createBlockNoteAIClient } from "../../blocknoteAIClient/client.js";
import { callLLM } from "./json.js";

function createEditor(initialContent: PartialBlock[]) {
  return BlockNoteEditor.create({
    initialContent,
  });
}

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

// const albert = createOpenAI({
//   // albert-etalab/neuralmagic/Meta-Llama-3.1-70B-Instruct-FP8
//   baseURL: "https://albert.api.staging.etalab.gouv.fr/v1",
//   ...client.getProviderSettings("albert-etalab"),
//   compatibility: "compatible",
// })("albert-etalab/neuralmagic/Meta-Llama-3.3-70B-Instruct-FP8");

function matchFileSnapshot(data: any, postFix = "") {
  expect(data).toMatchFileSnapshot(
    path.resolve(
      __dirname,
      "__snapshots__",
      path.basename(__filename),
      expect.getState().currentTestName! +
        (postFix ? `_${postFix}` : "") +
        ".json"
    )
  );
}

describe("Test environment", () => {
  // doesn't appear to be needed
  // it("should be running correct node version", () => {
  //   expect(process.version).toBe("v20.11.0");
  // });

  it("should have certs installed to connect to localhost", () => {
    expect(process.env.NODE_EXTRA_CA_CERTS).toBeDefined();

    /* if this test fails, maybe you're running tests via vscode extension?

    You'll need:

    "vitest.nodeEnv": {
      "NODE_EXTRA_CA_CERTS": "/Users/USERNAME/Library/Application Support/mkcert/rootCA.pem"
    }

    in your vscode settings (or other path to mkcert rootCA.pem)
    */
  });
});

// Main test suite with snapshot middleware
describe("Main tests", () => {
  // Define server with snapshot middleware for the main tests
  const server = setupServer(
    snapshot({
      updateSnapshots: "missing",
      // ignoreSnapshots: true,
      basePath: path.resolve(__dirname, "__msw_snapshots__"),
      // onFetchFromSnapshot(info, snapshot) {
      //   console.log("onFetchFromSnapshot", info, snapshot);
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

  describe.each([
    {
      model: openai,
      stream: true,
    },
    {
      model: openai,
      stream: false,
    },
    {
      model: groq,
      stream: true,
    },
    {
      model: groq,
      stream: false,
    },
    // {
    //   model: albert,
    //   stream: true,
    // },
  ])("Test AI operations", (params) => {
    describe("Update", () => {
      it("translates simple paragraphs", async () => {
        const editor = createEditor([
          {
            type: "paragraph",
            content: "Hello",
          },
          {
            type: "paragraph",
            content: "World",
          },
        ]);

        const result = await callLLM(editor, {
          stream: params.stream,
          model: params.model,
          prompt: "translate existing document to german",
        });

        await result.apply();

        // Add assertions here to check if the document was correctly translated
        // For example:
        // pass test name

        matchFileSnapshot(editor.document);

        // expect(await response.object).toMatchSnapshot();
      });

      it("changes simple formatting (paragraph)", async () => {
        const editor = createEditor([
          {
            type: "paragraph",
            content: "Hello",
          },
          {
            type: "paragraph",
            content: "World",
          },
        ]);

        const result = await callLLM(editor, {
          stream: params.stream,
          prompt: "change first paragraph to bold",
          model: params.model,
        });

        await result.apply();

        // Add assertions here to check if the document was correctly translated
        // For example:
        matchFileSnapshot(editor.document);

        // expect(await response.object).toMatchSnapshot();
      });

      it("changes simple formatting (word)", async () => {
        const editor = createEditor([
          {
            type: "paragraph",
            content: "Hello world",
          },
        ]);

        const result = await callLLM(editor, {
          stream: params.stream,
          prompt: "change first word to bold",
          model: params.model,
        });

        await result.apply();

        // Add assertions here to check if the document was correctly translated
        // For example:
        matchFileSnapshot(editor.document);

        // expect(await response.object).toMatchSnapshot();
      });
    });

    describe("Delete", () => {
      it("deletes a paragraph", async () => {
        const editor = createEditor([
          {
            type: "paragraph",
            content: "Hello",
          },
          {
            type: "paragraph",
            content: "World",
          },
        ]);
        const result = await callLLM(editor, {
          stream: params.stream,
          prompt: "delete the first sentence",
          model: params.model,
        });

        await result.apply();

        matchFileSnapshot(editor.document);

        // expect(await response.object).toMatchSnapshot();
      });
    });

    describe("Insert", () => {
      it("inserts a paragraph at start", async () => {
        const editor = createEditor([
          {
            type: "paragraph",
            content: "Hello",
          },
        ]);
        const result = await callLLM(editor, {
          prompt: "Add a sentence with `Test` before the first sentence",
          model: params.model,
          stream: params.stream,
        });

        await result.apply();

        matchFileSnapshot(editor.document);

        // expect(await response.object).toMatchSnapshot();
      });

      it("inserts a paragraph at end", async () => {
        const editor = createEditor([
          {
            type: "paragraph",
            content: "Hello",
          },
        ]);
        const result = await callLLM(editor, {
          stream: params.stream,
          prompt: `Add a paragraph with text "Test" after the first paragraph`,
          model: params.model,
        });

        await result.apply();

        matchFileSnapshot(editor.document);

        // expect(await response.object).toMatchSnapshot();
      });
    });
  });
});

// Separate test suite for error handling with its own server
describe("Error handling", () => {
  // Create a separate server for error tests with custom handlers
  const errorServer = setupServer();

  beforeAll(() => {
    errorServer.listen();
  });

  afterAll(() => {
    errorServer.close();
  });

  afterEach(() => {
    errorServer.resetHandlers();
  });

  it("handles 429 Too Many Requests error", async () => {
    // Set up handler for this specific test
    errorServer.use(
      http.post("*", () => {
        return new HttpResponse(
          JSON.stringify({
            error: {
              message: "Rate limit exceeded, please try again later",
              type: "rate_limit_exceeded",
              code: "rate_limit_exceeded",
            },
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      })
    );

    const editor = createEditor([
      {
        type: "paragraph",
        content: "Hello world",
      },
    ]);

    // Use a flag to track if an error was thrown
    let errorThrown = false;
    let caughtError: any = null;

    try {
      const result = await callLLM(editor, {
        stream: true,
        prompt: "translate to Spanish",
        model: openai,
        _streamObjectOptions: {
          maxRetries: 0,
        },
      });
      await result.apply();
    } catch (error: any) {
      errorThrown = true;
      caughtError = error;
    }

    // Assertions outside the try/catch
    expect(errorThrown).toBe(true);
    expect(caughtError).toBeDefined();
    expect(caughtError.message || caughtError.toString()).toContain(
      "Rate limit exceeded, please try again later"
    );
  });
});
