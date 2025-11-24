import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { BlockNoteEditor } from "@blocknote/core";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { Chat } from "@ai-sdk/react";
import { UIMessage } from "ai";
import { sendMessageWithAIRequest } from "../../../index.js";
import { ClientSideTransport } from "../../../streamTool/vercelAiSdk/clientside/ClientSideTransport.js";
import { testAIModels } from "../../../testUtil/testAIModels.js";
import { buildAIRequest } from "../../aiRequest/builder.js";

// Separate test suite for error handling with its own server
// skipping because it throws a (false) unhandled promise rejection in vitest
describe.skip("Error handling", () => {
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
            model: testAIModels.openai,
            stream,
            _additionalOptions: {
              maxRetries: 0,
            },
            objectGeneration: true, // TODO: switch to text
          }),
        });
        const aiRequest = await buildAIRequest({
          editor,
        });
        await sendMessageWithAIRequest(chat, aiRequest, {
          role: "user",
          parts: [
            {
              type: "text",
              text: "translate to Spanish",
            },
          ],
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
