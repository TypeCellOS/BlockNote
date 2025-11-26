import { Chat } from "@ai-sdk/react";
import { BlockNoteEditor } from "@blocknote/core";
import { ChatTransport, DefaultChatTransport, UIMessage, UIMessageChunk } from "ai";
import { describe, expect, it } from "vitest";
import { aiDocumentFormats } from "../../../server.js";
import { setupToolCallStreaming } from "./chatHandlers.js";

class FakeTransport extends DefaultChatTransport<any> {
  constructor(private chunks: UIMessageChunk[]) {
    super();
  }

  override async sendMessages({ }: Parameters<ChatTransport<UIMessage>['sendMessages']>[0]) {
   const chunks = this.chunks;
    return new ReadableStream<UIMessageChunk>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });
  }
}

describe("setupToolCallStreaming", () => {
  it("should handle missing tool error gracefully", async () => {
    const editor = BlockNoteEditor.create();
    const chat = new Chat({
      transport: new FakeTransport([
        { type: "start" },
        { type: "start-step" },
        {
          type: "tool-input-start",
          toolCallId: "call_1",
          toolName: "applyDocumentOperations",
        },
        {
          type: "tool-input-available",
          toolCallId: "call_1",
          toolName: "applyDocumentOperations",
          input: { operations: [{ type: "testTool", value: "hello" }] },
        },
        { type: "finish-step" },
        { type: "finish", finishReason: "stop" },
      ]),
    });

    const streamTools = aiDocumentFormats.html
      .getStreamToolsProvider({ withDelays: false })
      .getStreamTools(editor, false);

    const streaming = setupToolCallStreaming(streamTools, chat);

    await chat.sendMessage({
      role: "user",
      parts: [{ type: "text", text: "ignored" }],
    });

    const ret  = await streaming;

    expect(chat.status).toBe("ready");
    expect(ret.ok).toBe(false);
    if (!ret.ok) {
      expect(ret.error).toBeDefined();
      // We can check if the error message contains "No matching function" or similar
      // The error is likely wrapped or is the ChunkExecutionError
      // console.log(ret.error);
    }
  });
});
