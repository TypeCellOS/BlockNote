import { getErrorMessage } from "@ai-sdk/provider-utils";
import { Chat } from "@ai-sdk/react";
import { DeepPartial, isToolUIPart, UIMessage } from "ai";
import { StreamTool, StreamToolCall } from "../../streamTool.js";
import {
  ChunkExecutionError,
  StreamToolExecutor,
} from "../../StreamToolExecutor.js";
import { objectStreamToOperationsResult } from "./UIMessageStreamToOperationsResult.js";

/**
 * Listens to messages received in the `chat` object and processes tool calls
 * by streaming them to an executor
 *
 * It also listens to the status and error events of the chat object and handles them
 * appropriately.
 *
 * It also waits for all tool calls to be completed and then adds the results to the chat object.
 *
 * NOTE: listening to the `chat` object + error handling is a bit cumbersome. It might have been
 * cleaner to directly listen to the UIMessageStream. However, for that we'd probably
 * need to wrap the transport or chat object in AIExtension
 *
 * The error handling is currently quite convoluted. To properly test this,
 * you can:
 * a) make sure a tool call fails
 * b) make sure the entire request fails (network error)
 *
 */
export async function setupToolCallStreaming(
  streamTools: StreamTool<any>[],
  chat: Chat<UIMessage>,
  onStart?: () => void,
) {
  /*
  We use a single executor even for multiple tool calls.
  This is because a tool call operation (like Add), might behave differently
  if a block has been added earlier (i.e.: executing tools can keep state, 
  and this state is shared across parallel tool calls).
  */
  const executor = new StreamToolExecutor(streamTools);

  const appendableStream = createAppendableStream<any>();

  appendableStream.output.pipeTo(executor.writable);

  const toolCallStreams = new Map<string, ToolCallStreamData>();

  let first = true;

  // Possible improvement: instead of pushing tool call updates directly,
  // we could make this a readablestream where we return the latest state
  // of the tool call input. This way we don't process all intermediate
  // streaming steps in case downstream consumer (like the StreamToolExecutor)
  // are slower than the producer
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
            // this can happen in case of a network error for example
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
  const result = (await Promise.allSettled([executor.finish()]))[0];

  let error: ChunkExecutionError | undefined;
  if (result.status === "rejected") {
    if (result.reason instanceof ChunkExecutionError) {
      error = result.reason;
    } else {
      if (!chat.error) {
        throw new Error(
          "Unexpected: no ChunkExecutionError but also no chat.error (network error?)",
        );
      }
    }
  }

  let errorSeen = false;
  // process results
  const toolCalls = Array.from(
    toolCallStreams.values().filter((data) => data.complete),
  );
  toolCalls.forEach((toolCall, index) => {
    const isErrorTool =
      toolCall.toolCallId === error?.chunk.metadata.toolCallId;

    if (isErrorTool) {
      errorSeen = true;
    }

    chat.addToolResult({
      tool: toolCalls[index].toolName,
      toolCallId: toolCalls[index].toolCallId,
      output:
        errorSeen === false
          ? { status: "ok" }
          : isErrorTool
            ? { status: "error", error: getErrorMessage(error) }
            : { status: "not-executed-previous-tool-errored" },
    });
  });

  if (error) {
    throw error;
  }

  if (chat.error) {
    // response failed
    throw chat.error;
  }
}

function createAppendableStream<T>() {
  let controller: ReadableStreamDefaultController<T>;
  let ready = Promise.resolve();
  let canceled = false;
  const output = new ReadableStream({
    start(c) {
      controller = c;
    },
    cancel(reason) {
      canceled = true;
      controller.error(reason);
    },
  });

  async function append(readable: ReadableStream<T>) {
    if (canceled) {
      throw new Error("Appendable stream canceled, can't append");
    }
    const reader = readable.getReader();

    // Chain appends in sequence
    ready = ready.then(async () => {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          const { done, value } = await reader.read();
          if (done || canceled) {
            break;
          }
          controller.enqueue(value);
        } catch (e) {
          canceled = true;
          controller.error(e);
          break;
        }
      }
    });

    return ready;
  }

  async function finalize() {
    await ready; // wait for last appended stream to finish

    if (!canceled) {
      controller.close(); // only close once no more streams will come
    }
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
