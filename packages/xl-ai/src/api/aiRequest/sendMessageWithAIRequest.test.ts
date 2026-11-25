import { Chat } from "@ai-sdk/react";
import type { UIMessage, UIMessageChunk } from "ai";
import { afterEach, describe, expect, vi } from "vite-plus/test";
import { sendMessageWithAIRequest } from "./sendMessageWithAIRequest.js";
import { AIRequest } from "./types.js";

function createChat(messages: UIMessage[] = []) {
  return new Chat<UIMessage>({
    messages,
    transport: {
      async sendMessages() {
        return new ReadableStream<UIMessageChunk>({
          start(controller) {
            controller.close();
          },
        });
      },
      async reconnectToStream() {
        return null;
      },
    },
  });
}

function createRequest(editor: AIRequest["editor"]): AIRequest {
  return {
    editor,
    streamTools: [],
    onStart: vi.fn(),
    documentState: { selection: false, blocks: [], isEmptyDocument: true },
  };
}

afterEach(() => vi.restoreAllMocks());

describe("sendMessageWithAIRequest", () => {
  it("replaces stale document state and tool definitions while preserving custom options", async ({
    setupEditor,
  }) => {
    const chat = createChat();
    const send = vi.spyOn(chat, "sendMessage");
    const { editor } = await setupEditor();
    const request = createRequest(editor);
    const oldMetadata = {
      custom: { nested: [1, 2] },
      documentState: {
        selection: true,
        blocks: [{ block: "deleted" }],
        selectedBlocks: [{ id: "deleted", block: "deleted" }],
        isEmptyDocument: false,
      },
    };
    const message = {
      text: "Update the document",
      metadata: oldMetadata,
    };
    const options = {
      headers: { "X-Custom": "value" },
      metadata: { source: "custom", custom: { nested: [1, 2] } },
      body: { custom: { nested: [3, 4] }, toolDefinitions: { staleTool: {} } },
    };
    const originalOptions = structuredClone(options);

    await expect(
      sendMessageWithAIRequest(chat, request, message, options),
    ).resolves.toEqual({ ok: true, value: undefined });

    expect(message.metadata).toEqual({
      custom: oldMetadata.custom,
      documentState: request.documentState,
    });
    expect(oldMetadata.documentState.selectedBlocks).toHaveLength(1);
    expect(send).toHaveBeenCalledWith(message, {
      headers: options.headers,
      metadata: { ...options.metadata, source: "blocknote-ai" },
      body: {
        custom: options.body.custom,
        toolDefinitions: { applyDocumentOperations: expect.any(Object) },
      },
    });
    expect(options).toEqual(originalOptions);
  });

  it.for([undefined, null, "custom", 42])(
    "accepts absent or non-object metadata (%s)",
    async (metadata, { setupEditor }) => {
      const chat = createChat();
      const send = vi.spyOn(chat, "sendMessage");
      const { editor } = await setupEditor();
      const request = createRequest(editor);
      const message = { text: "Update", metadata };

      await sendMessageWithAIRequest(chat, request, message, { metadata });

      expect(message.metadata).toEqual({
        documentState: request.documentState,
      });
      expect(send).toHaveBeenCalledWith(message, {
        metadata: { source: "blocknote-ai" },
        body: {
          toolDefinitions: { applyDocumentOperations: expect.any(Object) },
        },
      });
    },
  );

  it("updates the last message when no message or options are supplied", async ({
    setupEditor,
  }) => {
    const chat = createChat([{ id: "last", role: "user", parts: [] }]);
    const send = vi.spyOn(chat, "sendMessage");
    const { editor } = await setupEditor();
    const request = createRequest(editor);

    await sendMessageWithAIRequest(chat, request);

    expect(chat.lastMessage?.metadata).toEqual({
      documentState: request.documentState,
    });
    expect(send).toHaveBeenCalledWith(undefined, {
      metadata: { source: "blocknote-ai" },
      body: {
        toolDefinitions: { applyDocumentOperations: expect.any(Object) },
      },
    });
  });
});
