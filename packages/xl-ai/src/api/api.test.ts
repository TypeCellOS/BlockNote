import { afterEach, describe, expect, it } from "vitest";

import { BlockNoteEditor, PartialBlock } from "@blocknote/core";

import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { callLLMStreaming } from "./api.js";
import { createBlockNoteAIClient } from "./client.js";

function createEditor(initialContent: PartialBlock[]) {
  return BlockNoteEditor.create({
    initialContent,
  });
}

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

describe("Test AI operations", () => {
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

      const response = await callLLMStreaming(editor, {
        model: groq,
        prompt: "translate to german",
      });

      // Add assertions here to check if the document was correctly translated
      // For example:
      expect(editor.document).toMatchSnapshot();

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

      const response = await callLLMStreaming(editor, {
        prompt: "change first paragraph to bold",
      });

      // Add assertions here to check if the document was correctly translated
      // For example:
      expect(editor.document).toMatchSnapshot();

      // expect(await response.object).toMatchSnapshot();
    });

    it("changes simple formatting (word)", async () => {
      const editor = createEditor([
        {
          type: "paragraph",
          content: "Hello world",
        },
      ]);

      const response = await callLLMStreaming(editor, {
        prompt: "change first word to bold",
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
      const response = await callLLMStreaming(editor, {
        prompt: "delete the first sentence",
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
      const response = await callLLMStreaming(editor, {
        prompt: "Add a sentence with `Test` before the first sentence",
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
      const response = await callLLMStreaming(editor, {
        prompt: "Add a sentence with `Test` after the first sentence",
      });

      expect(editor.document).toMatchSnapshot();

      // expect(await response.object).toMatchSnapshot();
    });
  });
});
