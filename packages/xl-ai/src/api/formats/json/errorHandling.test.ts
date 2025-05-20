import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createOpenAI } from "@ai-sdk/openai";
import { BlockNoteEditor } from "@blocknote/core";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { createBlockNoteAIClient } from "../../../blocknoteAIClient/client.js";
import { doLLMRequest } from "../../LLMRequest.js";
import { jsonLLMFormat } from "./json.js";

// Create client and models outside of test suites so they can be shared
const client = createBlockNoteAIClient({
  baseURL: "https://localhost:3000/ai",
  apiKey: "PLACEHOLDER",
});

const openai = createOpenAI({
  ...client.getProviderSettings("openai"),
})("gpt-4o-2024-08-06", {});

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
      const result = await doLLMRequest(editor, {
        stream: true,
        userPrompt: "translate to Spanish",
        model: openai,
        maxRetries: 0,
        dataFormat: jsonLLMFormat,
      });
      await result.execute();
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
