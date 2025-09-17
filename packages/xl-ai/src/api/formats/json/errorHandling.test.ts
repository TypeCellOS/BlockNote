import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createOpenAI } from "@ai-sdk/openai";
import { BlockNoteEditor } from "@blocknote/core";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { createBlockNoteAIClient } from "../../../blocknoteAIClient/client.js";

import { Chat } from "@ai-sdk/react";
import { UIMessage } from "ai";
import { ClientSideTransport } from "../../../streamTool/vercelAiSdk/clientside/ClientSideTransport.js";
import { doLLMRequest } from "../../LLMRequest.js";

// Create client and models outside of test suites so they can be shared
const client = createBlockNoteAIClient({
  baseURL: "https://localhost:3000/ai/proxy",
  apiKey: "PLACEHOLDER",
});

const openai = createOpenAI({
  ...client.getProviderSettings("openai"),
})("gpt-4o-2024-08-06");

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

  [{ stream: true }, { stream: false }].forEach(({ stream }) => {
    it(`handles 429 Too Many Requests error ${stream ? "streaming" : "non-streaming"}`, async () => {
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
            },
          );
        }),
      );

      const editor = BlockNoteEditor.create({
        initialContent: [
          {
            type: "paragraph",
            content: "Hello world",
          },
        ],
      });

      // Use a flag to track if an error was thrown
      let errorThrown = false;
      let caughtError: any = null;

      try {
        const chat = new Chat<UIMessage>({
          sendAutomaticallyWhen: () => false,
          transport: new ClientSideTransport({
            model: openai,
            stream,
            _additionalOptions: {
              maxRetries: 0,
            },
            objectGeneration: true, // TODO: switch to text
          }),
        });
        await doLLMRequest(editor, chat, {
          userPrompt: "translate to Spanish",
        });
      } catch (error: any) {
        errorThrown = true;
        caughtError = error;
      }

      // Assertions outside the try/catch
      expect(errorThrown).toBe(true);
      expect(caughtError).toBeDefined();
      expect(caughtError.message || caughtError.toString()).toContain(
        "Rate limit exceeded, please try again later",
      );
    });
  });
});
