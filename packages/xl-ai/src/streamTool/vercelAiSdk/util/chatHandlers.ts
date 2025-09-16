import { Chat } from "@ai-sdk/react";
import { DeepPartial, isToolUIPart, UIMessage } from "ai";
import { StreamTool, StreamToolCall } from "../../streamTool.js";
import { StreamToolExecutor } from "../../StreamToolExecutor.js";
import { objectStreamToOperationsResult } from "./UIMessageStreamToOperationsResult.js";

// Types for tool call streaming
type ToolCallStreamData = {
  stream: TransformStream<DeepPartial<{ operations: StreamToolCall<any>[] }>>;
  writer: WritableStreamDefaultWriter<
    DeepPartial<{ operations: StreamToolCall<any>[] }>
  >;
  complete: boolean;
};

/**
 * Process tool call parts and manage individual streams per toolCallId
 */
function processToolCallParts(
  chat: Chat<UIMessage>,
  toolCallStreams: Map<string, ToolCallStreamData>,
  mergedResultsWriter: WritableStreamDefaultWriter<any>,
  streamTools: StreamTool<any>[],
) {
  for (const part of chat.lastMessage?.parts ?? []) {
    if (!isToolUIPart(part)) {
      continue;
    }

    const toolCallId = part.toolCallId;

    // Create a new complete pipeline for this toolCallId if it doesn't exist
    if (!toolCallStreams.has(toolCallId)) {
      const toolCallData = createToolCallStream(
        mergedResultsWriter,
        streamTools,
      );
      toolCallStreams.set(toolCallId, toolCallData);
    }

    const toolCallData = toolCallStreams.get(toolCallId)!;
    processToolCallPart(part, toolCallData);
  }
}

/**
 * Create a complete stream pipeline for a single toolCallId
 */
function createToolCallStream(
  mergedResultsWriter: WritableStreamDefaultWriter<any>,
  streamTools: StreamTool<any>[],
): ToolCallStreamData {
  const stream = new TransformStream<
    DeepPartial<{ operations: StreamToolCall<any>[] }>
  >();
  const operationsStream = objectStreamToOperationsResult(
    stream.readable,
    streamTools,
  );
  const writer = stream.writable.getWriter();

  // Write operations results directly to the merged results writer
  operationsStream.pipeTo(
    new WritableStream({
      write(chunk) {
        mergedResultsWriter.write(chunk);
      },
      close() {
        // Don't close the merged results writer here - it will be closed when all tool calls are done
      },
    }),
  );

  return {
    stream,
    writer,
    complete: false,
  };
}

/**
 * Process a single tool call part (streaming or available)
 */
function processToolCallPart(part: any, toolCallData: ToolCallStreamData) {
  if (part.state === "input-streaming") {
    const input = part.input;
    if (input !== undefined) {
      toolCallData.writer.write(input as any);
    }
  } else if (part.state === "input-available") {
    const input = part.input;
    if (input === undefined) {
      throw new Error("input is undefined");
    }
    if (!toolCallData.complete) {
      toolCallData.complete = true;
      toolCallData.writer.write(input as any);
      console.log("processToolCallPart close", part.toolCallId, input);
      toolCallData.writer.close();
    }
  }
}

/**
 * Set up tool call streaming infrastructure with individual streams per toolCallId
 * and merged results processing
 */
export async function setupToolCallStreaming(
  streamTools: StreamTool<any>[],
  chat: Chat<UIMessage>,
  onStart: () => void,
) {
  const executor = new StreamToolExecutor(streamTools);
  const toolCallStreams = new Map<string, ToolCallStreamData>();

  let first = true;
  const mergedResultsStream = new TransformStream<any, any>({
    transform: (chunk, controller) => {
      if (first) {
        onStart();
        first = false;
      }
      controller.enqueue(chunk);
    },
  });
  const mergedResultsStreamWritable = mergedResultsStream.writable;
  const mergedResultsWriter = mergedResultsStreamWritable.getWriter();

  mergedResultsStream.readable.pipeTo(executor.writable);

  const unsub = chat["~registerMessagesCallback"](() => {
    console.log("messagesCallback", chat.lastMessage);
    processToolCallParts(
      chat,
      toolCallStreams,
      mergedResultsWriter,
      streamTools,
    );
  });

  const statusHandler = new Promise<void>((resolve, reject) => {
    const unsub2 = chat["~registerStatusCallback"](() => {
      if (chat.status === "ready" || chat.status === "error") {
        console.log("statusHandler close", chat.status);
        mergedResultsWriter.close();
        unsub();
        unsub2();

        if (chat.status === "ready") {
          resolve();
        } else {
          reject(chat.status);
        }
      }
    });
  });

  await statusHandler;
  await executor.waitTillEnd();
}
