import { getErrorMessage } from "@ai-sdk/provider-utils";
import { Chat } from "@ai-sdk/react";
import { DeepPartial, isToolUIPart, UIMessage } from "ai";
import { StreamTool, StreamToolCall } from "../../streamTool.js";
import { StreamToolExecutor } from "../../StreamToolExecutor.js";
import { objectStreamToOperationsResult } from "./UIMessageStreamToOperationsResult.js";

// TODO: comment file + design decisions
// TODO: add notice about single executor (with downside that maybe streamtools must be changeable?)

function createAppendableStream<T>() {
  let controller: ReadableStreamDefaultController<T>;
  let ready = Promise.resolve();

  const output = new ReadableStream({
    start(c) {
      controller = c;
    },
  });

  async function append(readable: ReadableStream<T>) {
    const reader = readable.getReader();

    // Chain appends in sequence
    ready = ready.then(async () => {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        controller.enqueue(value);
      }
    });

    return ready;
  }

  async function finalize() {
    await ready; // wait for last appended stream to finish
    controller.close(); // only close once no more streams will come
  }

  return { output, append, finalize };
}

// Types for tool call streaming
type ToolCallStreamData = {
  // stream: TransformStream<DeepPartial<{ operations: StreamToolCall<any>[] }>>;
  writer: WritableStreamDefaultWriter<
    DeepPartial<{ operations: StreamToolCall<any>[] }>
  >;
  complete: boolean;
  toolName: string;
  toolCallId: string;
  operationsStream: ReadableStream<any>;
  // executor: StreamToolExecutor<any>;
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

    const toolName = part.type.replace("tool-", "");

    if (toolName !== "applyDocumentOperations") {
      // we only process the combined operations tool call
      // in a future improvement we can add more generic support for different tool streaming
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
  toolName: string,
  toolCallId: string,
): ToolCallStreamData {
  const stream = new TransformStream<
    DeepPartial<{ operations: StreamToolCall<any>[] }>
  >();
  const operationsStream = objectStreamToOperationsResult(
    stream.readable,
    streamTools,
    { toolCallId },
  );

  const writer = stream.writable.getWriter();

  return {
    // stream,
    writer,
    complete: false,
    // executor,
    operationsStream,
    toolName,
    toolCallId,
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
  onStart?: () => void,
) {
  let erroredChunk: any | undefined;

  const executor = new StreamToolExecutor(streamTools, (chunk, success) => {
    if (!success) {
      erroredChunk = chunk;
    }
  });

  const appendableStream = createAppendableStream<any>();

  appendableStream.output.pipeTo(executor.writable);

  const toolCallStreams = new Map<string, ToolCallStreamData>();

  let first = true;

  const unsub = chat["~registerMessagesCallback"](() => {
    processToolCallParts(chat, (data) => {
      if (!toolCallStreams.has(data.toolCallId)) {
        const toolCallStreamData = createToolCallStream(
          streamTools,
          data.toolName,
          data.toolCallId,
        );
        appendableStream.append(toolCallStreamData.operationsStream);
        toolCallStreams.set(data.toolCallId, toolCallStreamData);
        if (first) {
          first = false;
          onStart?.();
        }
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
  // (possible improvement(?): we can abort the request if any of the tool calls fail
  //  instead of waiting for the entire llm response)
  await statusHandler;

  // we're not going to append any more streams from tool calls, because we've seen all tool calls
  await appendableStream.finalize();

  // let all stream executors finish, this can take longer due to artificial delays
  // (e.g. to simulate human typing behaviour)
  const result = (await Promise.allSettled([executor.waitTillEnd()]))[0];

  if (result.status === "rejected" && !erroredChunk) {
    throw new Error(
      "Unexpected: executor.waitTillEnd() rejected but no erroredChunk",
      { cause: result.reason },
    );
  }

  let errorSeen = false;
  // process results
  const toolCalls = Array.from(toolCallStreams.values());
  toolCalls.forEach((toolCall, index) => {
    const isErrorTool =
      toolCall.toolCallId === erroredChunk?.metadata.toolCallId;
    let error: string | undefined;
    if (isErrorTool) {
      if (result.status === "fulfilled") {
        throw new Error(
          "Unexpected: executor.waitTillEnd() fulfilled but erroredChunk",
          { cause: erroredChunk },
        );
      }
      error = getErrorMessage(result.reason);
      errorSeen = true;
    }

    chat.addToolResult({
      tool: toolCalls[index].toolName,
      toolCallId: toolCalls[index].toolCallId,
      output:
        errorSeen === false
          ? { status: "ok" }
          : isErrorTool
            ? { status: "error", error }
            : { status: "not-executed-previous-tool-errored" },
    });
  });

  if (result.status === "rejected") {
    throw result.reason;
  }

  if (chat.error) {
    // response failed
    throw chat.error;
  }
}
