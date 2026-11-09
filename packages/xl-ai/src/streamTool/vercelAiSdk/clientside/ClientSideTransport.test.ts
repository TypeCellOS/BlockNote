import { Chat } from "@ai-sdk/react";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vite-plus/test";
import { ClientSideTransport } from "./ClientSideTransport.js";

describe("ClientSideTransport with AI SDK 7", () => {
  it("streams a v4 model tool call into Chat and accepts its output", async () => {
    const input = JSON.stringify({ operations: [] });
    const model = new MockLanguageModelV4({
      doStream: async () => ({
        stream: simulateReadableStream({
          initialDelayInMs: null,
          chunkDelayInMs: null,
          chunks: [
            { type: "stream-start", warnings: [] },
            {
              type: "tool-input-start",
              id: "call-1",
              toolName: "applyDocumentOperations",
            },
            { type: "tool-input-delta", id: "call-1", delta: input },
            { type: "tool-input-end", id: "call-1" },
            {
              type: "tool-call",
              toolCallId: "call-1",
              toolName: "applyDocumentOperations",
              input,
            },
            {
              type: "finish",
              finishReason: { unified: "tool-calls", raw: undefined },
              usage: {
                inputTokens: {
                  total: 1,
                  noCache: 1,
                  cacheRead: undefined,
                  cacheWrite: undefined,
                },
                outputTokens: { total: 1, text: 1, reasoning: undefined },
              },
            },
          ],
        }),
      }),
    });
    const chat = new Chat({
      transport: new ClientSideTransport({
        model,
        systemPrompt: "Edit the document using tools.",
      }),
    });

    await chat.sendMessage(
      { text: "Update my document" },
      {
        body: {
          toolDefinitions: {
            applyDocumentOperations: {
              description: "Apply document operations",
              inputSchema: {
                type: "object",
                properties: { operations: { type: "array", items: {} } },
                required: ["operations"],
              },
              outputSchema: {
                type: "object",
                properties: { status: { type: "string" } },
                required: ["status"],
              },
            },
          },
        },
      },
    );

    expect(chat.error).toBeUndefined();
    expect(chat.status).toBe("ready");
    expect(chat.lastMessage?.parts).toContainEqual(
      expect.objectContaining({
        type: "tool-applyDocumentOperations",
        state: "input-available",
        toolCallId: "call-1",
        input: { operations: [] },
      }),
    );
    expect(model.doStreamCalls[0].prompt[0]).toMatchObject({
      role: "system",
      content: "Edit the document using tools.",
    });

    await chat.addToolOutput({
      tool: "applyDocumentOperations",
      toolCallId: "call-1",
      output: { status: "ok" },
    });
    expect(chat.lastMessage?.parts).toContainEqual(
      expect.objectContaining({
        state: "output-available",
        output: { status: "ok" },
      }),
    );
  });
});
