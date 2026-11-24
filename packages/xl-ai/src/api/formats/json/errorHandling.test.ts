import { createOpenAI } from "@ai-sdk/openai";
import { Chat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, vi } from "vite-plus/test";
import { ClientSideTransport } from "../../../streamTool/vercelAiSdk/clientside/ClientSideTransport.js";
import { buildAIRequest } from "../../aiRequest/builder.js";
import { sendMessageWithAIRequest } from "../../aiRequest/sendMessageWithAIRequest.js";
import { jsonBlockLLMFormat } from "./json.js";

describe("Error handling", () => {
  // This remains a real SDK request, but cannot reach a provider if interception fails.
  const baseURL = "https://openai.fixture.invalid/v1";
  const errorServer = setupServer(
    http.post(`${baseURL}/responses`, () =>
      HttpResponse.json(
        {
          error: {
            message: "Rate limit exceeded, please try again later",
            type: "rate_limit_exceeded",
            code: "rate_limit_exceeded",
          },
        },
        { status: 429 },
      ),
    ),
  );

  beforeAll(() => {
    errorServer.listen({ onUnhandledRequest: "error" });
  });
  afterAll(() => {
    errorServer.close();
  });

  it("handles 429 Too Many Requests error", async ({ setupEditor }) => {
    const { editor } = await setupEditor({
      initialContent: [
        {
          type: "paragraph",
          content: "Hello world",
        },
      ],
    });

    const onError = vi.fn();
    const chat = new Chat<UIMessage>({
      sendAutomaticallyWhen: () => false,
      transport: new ClientSideTransport({
        model: createOpenAI({
          apiKey: "fixture-only",
          baseURL,
        }).responses("gpt-4o-2024-08-06"),
        stream: true,
        _additionalOptions: {
          maxRetries: 0,
          onError,
        },
      }),
    });
    const aiRequest = await buildAIRequest({
      editor,
      // The provider rejects the request before running any tools. Keep the
      // default tools but build the prompt state without serializing HTML.
      documentStateBuilder: jsonBlockLLMFormat.defaultDocumentStateBuilder,
    });
    const ret = await sendMessageWithAIRequest(chat, aiRequest, {
      role: "user",
      parts: [
        {
          type: "text",
          text: "translate to Spanish",
        },
      ],
    });

    expect(ret.ok).toBe(true);
    expect(onError).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        error: expect.objectContaining({ statusCode: 429 }),
      }),
    );
    expect(chat.status).toBe("error");
    expect(chat.error).toBeDefined();
    expect(chat.error?.message).toContain(
      "Rate limit exceeded, please try again later",
    );
  });
});
