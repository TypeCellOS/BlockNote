import { getErrorMessage } from "@ai-sdk/provider-utils";
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
  executor: StreamToolExecutor<any>;
};

/**
 * Process tool call parts and manage individual streams per toolCallId
 */
function processToolCallParts(
  chat: Chat<UIMessage>,
  getToolCallStreamData: (data: {
    toolName: string;
    toolCallId: string;
  }) => ToolCallStreamData,
) {
  for (const part of chat.lastMessage?.parts ?? []) {
    if (!isToolUIPart(part)) {
      continue;
    }

    const toolCallId = part.toolCallId;

    const toolCallData = getToolCallStreamData({
      toolName: part.type.replace("tool-", ""),
      toolCallId,
    });

    processToolCallPart(part, toolCallData);
  }
}

/**
 * Create a complete stream pipeline for a single toolCallId
 */
function createToolCallStream(
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

  const executor = new StreamToolExecutor(streamTools);

  // Pipe operations directly into this tool call's executor
  operationsStream.pipeTo(executor.writable);

  return {
    stream,
    writer,
    complete: false,
    executor,
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
  const toolCallStreams = new Map<string, ToolCallStreamData>();

  const executePromises: Promise<void>[] = [];

  let first = true;

  const unsub = chat["~registerMessagesCallback"](() => {
    processToolCallParts(chat, (data) => {
      if (!toolCallStreams.has(data.toolCallId)) {
        const toolCallStreamData = createToolCallStream(streamTools);
        toolCallStreams.set(data.toolCallId, toolCallStreamData);
        if (first) {
          first = false;
          onStart();
        }
        executePromises.push(
          toolCallStreamData.executor.waitTillEnd().then(
            () => {
              chat.addToolResult({
                tool: data.toolName,
                toolCallId: data.toolCallId,
                output: { status: "ok" },
              });
            },
            (error) => {
              // TODO: in a later version of the sdk, make sure we set output-error if possible?
              // (currently no such method seems to be exposed)
              chat.addToolResult({
                tool: data.toolName,
                toolCallId: data.toolCallId,
                output: { status: "error", error: getErrorMessage(error) },
              });
            },
          ),
        );
      }
      return toolCallStreams.get(data.toolCallId)!;
    });
  });

  const statusHandler = new Promise<void>((resolve) => {
    const unsub2 = chat["~registerStatusCallback"](() => {
      if (chat.status === "ready" || chat.status === "error") {
        unsub();
        unsub2();
        if (chat.status !== "error") {
          // don't unsubscribe the error listener if chat.status === "error"
          // we need to wait for the error event, because only in the error event we can read chat.error
          // (in this status listener, it's still undefined)
          unsub3();
        }
        resolve();
      }
    });

    const unsub3 = chat["~registerErrorCallback"](() => {
      if (chat.error) {
        unsub3();
        for (const data of toolCallStreams.values()) {
          if (!data.complete) {
            data.writer.abort(chat.error);
          }
        }
        // reject(chat.error);
        // we intentionally commented out the above line to not reject here
        // instead, we abort (raise an error) in the unfinished tool calls
      }
    });
  });

  // wait until all messages have been received
  await statusHandler;

  // let all stream executors finish, this can take longer due to artificial delays
  // (e.g. to simulate human typing behaviour)
  await Promise.all(executePromises);

  if (chat.error) {
    // if there was an error, it's likely we already throwed it in the line above,
    // however, theoretically there could be an error (e.g.: network error) in a message part after the last tool call
    // in this case we still need to throw here
    throw chat.error;
  }
}
