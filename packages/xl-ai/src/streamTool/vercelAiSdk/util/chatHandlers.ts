import { getErrorMessage } from "@ai-sdk/provider-utils";
import type { Chat } from "@ai-sdk/react";
import {
  DeepPartial,
  isToolUIPart,
  UIMessage,
  UITool,
  UIToolInvocation,
} from "ai";
import { ChunkExecutionError } from "../../ChunkExecutionError.js";
import { Result, StreamTool, StreamToolCall } from "../../streamTool.js";
import { StreamToolExecutor } from "../../StreamToolExecutor.js";
import { createAppendableStream } from "./appendableStream.js";
import {
  objectStreamToOperationsResult,
  operationsObjectStreamToOperationsResult,
} from "./UIMessageStreamToOperationsResult.js";

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
  chat: Chat<any>,
  onStart?: () => void,
  abortSignal?: AbortSignal,
): Promise<Result<void>> {
  /*
  We use a single executor even for multiple tool calls.
  This is because a tool call operation (like Add), might behave differently
  if a block has been added earlier (i.e.: executing tools can keep state, 
  and this state is shared across parallel tool calls).
  */
  const executor = new StreamToolExecutor(streamTools, abortSignal);
  await executor.init();

  const appendableStream = createAppendableStream<any>();

  const pipeToPromise = appendableStream.output.pipeTo(executor.writable);

  const toolCallStreams = new Map<string, ToolCallStreamData>();

  let first = true;

  // Possible improvement: instead of pushing tool call updates directly,
  // we could make this a readablestream where we return the latest state
  // of the tool call input. This way we don't process all intermediate
  // streaming steps in case downstream consumer (like the StreamToolExecutor)
  // are slower than the producer
  const unsub = chat["~registerMessagesCallback"](() => {
    const calls = getToolCalls(chat);
    for (const call of calls) {
      if (!toolCallStreams.has(call.part.toolCallId)) {
        const toolCallStreamData = createToolCallStream(
          streamTools,
          call.toolName,
          call.part.toolCallId,
        );
        if (!toolCallStreamData) {
          continue;
        }
        appendableStream.append(toolCallStreamData.operationsStream);
        toolCallStreams.set(call.part.toolCallId, toolCallStreamData);
        if (first) {
          first = false;
          onStart?.();
        }
      }
      const data = toolCallStreams.get(call.part.toolCallId);
      if (data) {
        processToolCallPart(call.part, data);
      }
    }
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
  const results = await Promise.allSettled([executor.finish(), pipeToPromise]); // awaiting pipeToPromise as well to prevent unhandled promises
  const result = results[0];

  if (
    results[1].status === "rejected" &&
    (results[0].status !== "rejected" ||
      results[0].reason !== results[1].reason)
  ) {
    throw new Error(
      "unexpected, pipeToPromise rejected but executor.finish() doesn't have same error!?",
    );
  }

  let error: ChunkExecutionError | undefined;

  if (result.status === "rejected") {
    if (result.reason instanceof ChunkExecutionError) {
      // all errors thrown in the pipeline should be ChunkExecutionErrors,
      // so we can retrieve the chunk that caused the error
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

    // TODO: it would be better to add these tool outputs "live" as they occur,
    // possibly including a callback to create checkpoints after applying a tool
    if (!errorSeen) {
      chat.addToolOutput({
        state: "output-available",
        tool: toolCalls[index].toolName,
        toolCallId: toolCalls[index].toolCallId,

        output: { status: "ok" },
      });
    } else {
      chat.addToolOutput({
        tool: toolCalls[index].toolName,
        toolCallId: toolCalls[index].toolCallId,
        state: "output-error",
        errorText: JSON.stringify(
          isErrorTool
            ? { status: "error", error: getErrorMessage(error) }
            : { status: "not-executed-previous-tool-errored" },
        ),
      });
    }
  });

  return error
    ? {
        ok: false,
        error,
      }
    : { ok: true, value: void 0 };
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
function getToolCalls(chat: Chat<UIMessage>) {
  const toolCalls: {
    toolName: string;
    part: UIToolInvocation<UITool>;
  }[] = [];
  // TODO: better to check if tool has output instead of hardcoding lastMessage
  for (const part of chat.lastMessage?.parts ?? []) {
    if (!isToolUIPart(part)) {
      continue;
    }

    const toolName = part.type.replace("tool-", "");

    toolCalls.push({ toolName, part });
  }

  return toolCalls;
}

/**
 * Create a complete stream pipeline for a single toolCallId
 */
function createToolCallStream(
  streamTools: StreamTool<any>[],
  toolName: string,
  toolCallId: string,
): ToolCallStreamData | undefined {
  const stream = new TransformStream<
    DeepPartial<{ operations: StreamToolCall<any>[] }>
  >();
  let operationsStream: ReturnType<typeof objectStreamToOperationsResult>;
  if (toolName === "applyDocumentOperations") {
    operationsStream = operationsObjectStreamToOperationsResult(
      stream.readable,
      streamTools,
      { toolCallId },
    );
  } else if (streamTools.find((tool) => tool.name === toolName)) {
    operationsStream = objectStreamToOperationsResult(
      stream.readable,
      streamTools,
      { toolCallId },
    );
  } else {
    return undefined;
  }

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
  // TODO: what if data is the same?
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
