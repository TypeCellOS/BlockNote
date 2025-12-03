import { Chat } from "@ai-sdk/react";
import { BlockNoteEditor } from "@blocknote/core";
import {
  ChatTransport,
  DefaultChatTransport,
  UIMessage,
  UIMessageChunk,
} from "ai";
import { describe, expect, it } from "vitest";
import { aiDocumentFormats } from "../../../server.js";
import { ChunkExecutionError } from "../../ChunkExecutionError.js";
import { setupToolCallStreaming } from "./chatHandlers.js";

class FakeTransport extends DefaultChatTransport<any> {
  constructor(private chunks: UIMessageChunk[]) {
    super();
  }

  override async sendMessages(
    _: Parameters<ChatTransport<UIMessage>["sendMessages"]>[0],
  ) {
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

    const ret = await streaming;

    expect(chat.status).toBe("ready");
    expect(ret.ok).toBe(false);
    if (ret.ok) {
      throw new Error("expected error");
    }

    expect(ret.error).toBeDefined();
    // We can check if the error message contains "No matching function" or similar
    // The error is likely wrapped or is the ChunkExecutionError
    // console.log(ret.error);
  });

  it("should handle abort signal", async () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          type: "paragraph",
          id: "ref1",
        },
      ],
    });
    const abortController = new AbortController();

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
          input: {
            operations: [
              {
                type: "add",
                position: "after",
                referenceId: "ref1$",
                blocks: ["<p>insert a long block to test the abort signal</p>"],
              },
            ],
          },
        },
        { type: "finish-step" },
        { type: "finish", finishReason: "stop" },
      ]),
    });

    const streamTools = aiDocumentFormats.html
      .getStreamToolsProvider({ withDelays: true })
      .getStreamTools(editor, false);

    const streaming = setupToolCallStreaming(
      streamTools,
      chat,
      undefined,
      abortController.signal,
    );

    await chat.sendMessage({
      role: "user",
      parts: [{ type: "text", text: "test" }],
    });

    // Abort the operation
    abortController.abort();

    const ret = await streaming;

    expect(ret.ok).toBe(false);
    if (ret.ok) {
      throw new Error("expected error");
    }

    expect(ret.error).toBeDefined();
    const errorMessage =
      ret.error instanceof Error ? ret.error.message : String(ret.error);
    expect(errorMessage).toContain("aborted");
    expect((ret.error as ChunkExecutionError).aborted).toBe(true);
  });

  it("should handle abort signal that is already aborted", async () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          type: "paragraph",
          id: "ref1",
        },
      ],
    });
    const abortController = new AbortController();

    // Abort before setting up streaming
    abortController.abort();

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
          input: {
            operations: [
              {
                type: "add",
                position: "after",
                referenceId: "ref1$",
                blocks: ["<p>test</p>"],
              },
            ],
          },
        },
        { type: "finish-step" },
        { type: "finish", finishReason: "stop" },
      ]),
    });

    const streamTools = aiDocumentFormats.html
      .getStreamToolsProvider({ withDelays: true })
      .getStreamTools(editor, false);

    // This should handle the already-aborted signal gracefully
    const streaming = setupToolCallStreaming(
      streamTools,
      chat,
      undefined,
      abortController.signal,
    );

    await chat.sendMessage({
      role: "user",
      parts: [{ type: "text", text: "test" }],
    });

    const ret = await streaming;

    // The operation should be aborted
    expect(ret.ok).toBe(false);
    if (ret.ok) {
      throw new Error("expected error");
    }

    expect(ret.error).toBeDefined();
    const errorMessage =
      ret.error instanceof Error ? ret.error.message : String(ret.error);
    expect(errorMessage).toContain("aborted");
    expect((ret.error as ChunkExecutionError).aborted).toBe(true);
  });
});
