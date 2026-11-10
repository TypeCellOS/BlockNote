import { Chat } from "@ai-sdk/react";
import { BlockNoteEditor } from "@blocknote/core";
import { UIMessage } from "ai";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { sendMessageWithAIRequest } from "./sendMessageWithAIRequest.js";
import { AIRequest } from "./types.js";

vi.mock("../../streamTool/index.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../streamTool/index.js")>()),
  setupToolCallStreaming: vi.fn(async () => ({ ok: true, value: undefined })),
}));

function createRequest(): AIRequest {
  return {
    editor: BlockNoteEditor.create(),
    streamTools: [],
    onStart: vi.fn(),
    documentState: { selection: false, blocks: [], isEmptyDocument: true },
  };
}

afterEach(() => vi.restoreAllMocks());

describe("sendMessageWithAIRequest", () => {
  it("replaces stale document state and tool definitions while preserving custom options", async () => {
    const chat = new Chat<UIMessage>({});
    const send = vi.spyOn(chat, "sendMessage").mockResolvedValue(undefined);
    const request = createRequest();
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

  it.each([undefined, null, "custom", 42])(
    "accepts absent or non-object metadata (%s)",
    async (metadata) => {
      const chat = new Chat<UIMessage>({});
      const send = vi.spyOn(chat, "sendMessage").mockResolvedValue(undefined);
      const request = createRequest();
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

  it("updates the last message when no message or options are supplied", async () => {
    const chat = new Chat<UIMessage>({
      messages: [{ id: "last", role: "user", parts: [] }],
    });
    const send = vi.spyOn(chat, "sendMessage").mockResolvedValue(undefined);
    const request = createRequest();

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
