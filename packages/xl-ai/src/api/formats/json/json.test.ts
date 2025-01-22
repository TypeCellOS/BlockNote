import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { BlockNoteEditor, PartialBlock } from "@blocknote/core";

import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
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

beforeAll(() => {
  const server = setupServer(
    snapshot({
      updateSnapshots: "missing",
      // ignoreSnapshots: true,
      basePath: path.resolve(__dirname, "__msw_snapshots__"),
      onFetchFromSnapshot(info, snapshot) {
        // console.log("onFetchFromSnapshot", info, snapshot);
      },
      onFetchFromServer(info, snapshot) {
        // console.log("onFetchFromServer", info, snapshot);
      },
    })
  );
  server.listen();
});

const client = createBlockNoteAIClient({
  baseURL: "https://localhost:3000/ai",
  apiKey: "PLACEHOLDER",
});

const groq = createGroq({
  ...client.getProviderSettings("groq"),
})("llama-3.1-70b-versatile");

const openai = createOpenAI({
  ...client.getProviderSettings("openai"),
})("gpt-4o-2024-08-06", {});

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
])("Test AI operations", (params) => {
  afterEach(() => {
    delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
  });

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

      const response = await callLLM(editor, {
        stream: params.stream,
        model: params.model,
        prompt: "translate existing document to german",
      });

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

      const response = await callLLM(editor, {
        stream: params.stream,
        prompt: "change first paragraph to bold",
        model: params.model,
      });

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

      const response = await callLLM(editor, {
        stream: params.stream,
        prompt: "change first word to bold",
        model: params.model,
      });

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
      const response = await callLLM(editor, {
        stream: params.stream,
        prompt: "delete the first sentence",
        model: params.model,
      });

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
      const response = await callLLM(editor, {
        prompt: "Add a sentence with `Test` before the first sentence",
        model: params.model,
        stream: params.stream,
      });

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
      const response = await callLLM(editor, {
        stream: params.stream,
        prompt: "Add a sentence with `Test` after the first sentence",
        model: params.model,
      });

      matchFileSnapshot(editor.document);

      // expect(await response.object).toMatchSnapshot();
    });
  });
});
