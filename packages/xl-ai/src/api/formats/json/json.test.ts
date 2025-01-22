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
      updateSnapshots: true,
      ignoreSnapshots: true,
      basePath: path.resolve(__dirname, "__msw_snapshots__"),
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

const model = openai;

describe.each(["openai", "groq"])("Test AI operations", (provider) => {
  afterEach(() => {
    delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
  });

  describe.only("Update", () => {
    it.only("translates simple paragraphs", async () => {
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
        model,
        stream: false,
        prompt: "translate to german",
      });

      // Add assertions here to check if the document was correctly translated
      // For example:
      expect(editor.document).toMatchSnapshot();

      // expect(await response.object).toMatchSnapshot();
    });

    it.skip("changes simple formatting (paragraph)", async () => {
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
        prompt: "change first paragraph to bold",
        model,
      });

      // Add assertions here to check if the document was correctly translated
      // For example:
      expect(editor.document).toMatchSnapshot();

      // expect(await response.object).toMatchSnapshot();
    });

    it.skip("changes simple formatting (word)", async () => {
      const editor = createEditor([
        {
          type: "paragraph",
          content: "Hello world",
        },
      ]);

      const response = await callLLM(editor, {
        prompt: "change first word to bold",
        model,
      });

      // Add assertions here to check if the document was correctly translated
      // For example:
      expect(editor.document).toMatchSnapshot();

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
        prompt: "delete the first sentence",
        model,
      });

      expect(editor.document).toMatchSnapshot();

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
        model,
      });

      expect(editor.document).toMatchSnapshot();

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
        prompt: "Add a sentence with `Test` after the first sentence",
        model,
      });

      expect(editor.document).toMatchSnapshot();

      // expect(await response.object).toMatchSnapshot();
    });
  });
});
