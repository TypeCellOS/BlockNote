import { getErrorMessage } from "@ai-sdk/provider-utils";
import { ObjectStreamPart, UIMessageChunk } from "ai";

/**
 * This file contains some helper functions to convert between object generation (streaming and non-streaming)
 * and UI Message streams and vice versa.
 *
 * We convert object streams / generated objects to tool calls in UIMessageStreams because:
 *
 * - it simplifies our codebase (we can just handle everything as tool calls after conversion)
 * - there are some issues with using a TextStream, see below:
 *
 * Normally, the AI SDK uses a TextStream to transport generated objects / object streams.
 * However, this does not work well with error handling
 *
 * See:
 *
 * @see https://github.com/vercel/ai/issues/5027#issuecomment-2701011869
 * @see https://github.com/vercel/ai/issues/5115
 */

/**
 * Transforms a partial object stream to a data stream format.
 * This is needed to pass errors through to the client in a clean way.
 *
 * @param stream - The partial object stream to transform
 * @returns A ReadableStream that emits data stream formatted chunks
 *
 * Based on: https://github.com/vercel/ai/blob/b2469681bd31635a33a4b233d889f122c0b432c9/packages/ai/src/ui/transform-text-to-ui-message-stream.ts#L3
 *
 */
export function partialObjectStreamAsToolCallInUIMessageStream<PARTIAL>(
  stream: ReadableStream<ObjectStreamPart<PARTIAL>>,
  toolName: string,
): ReadableStream<UIMessageChunk> {
  let accumulatedString = "";
  return stream.pipeThrough(
    new TransformStream({
      start(controller) {
        controller.enqueue({ type: "start" });
        controller.enqueue({ type: "start-step" });
        controller.enqueue({
          type: "tool-input-start",
          toolCallId: "call_object_1",
          toolName,
        });
        // controller.enqueue({ type: "text-start", id: "text-1" });
      },
      transform(chunk, controller) {
        switch (chunk.type) {
          case "text-delta":
            accumulatedString += chunk.textDelta;
            controller.enqueue({
              type: "tool-input-delta",
              toolCallId: "call_object_1",
              inputTextDelta: chunk.textDelta,
            });
            break;
          case "object":
          case "finish":
            break;
          case "error":
            controller.enqueue({
              type: "error",
              errorText: getErrorMessage(chunk.error),
            });
            break;
          default: {
            const _exhaustiveCheck: never = chunk;
            throw new Error(`Unsupported chunk type: ${_exhaustiveCheck}`);
          }
        }
      },
      async flush(controller) {
        // controller.enqueue({ type: "text-end", id: "text-1" });
        controller.enqueue({
          type: "tool-input-available",
          toolCallId: "call_object_1",
          toolName,
          input: JSON.parse(accumulatedString),
        });
        controller.enqueue({ type: "finish-step" });
        controller.enqueue({ type: "finish" });
      },
    }),
  );
}

// convert a plain object to a UIMessageStream.
export function objectAsToolCallInUIMessageStream(
  object: any,
  toolName: string,
) {
  const stream = new ReadableStream<UIMessageChunk>({
    start(controller) {
      controller.enqueue({ type: "start" });
      controller.enqueue({ type: "start-step" });
      controller.enqueue({
        type: "tool-input-start",
        toolCallId: "call_object_1",
        toolName,
      });
      controller.enqueue({
        type: "tool-input-delta",
        toolCallId: "call_object_1",
        inputTextDelta: JSON.stringify(object),
      });
      controller.enqueue({
        type: "tool-input-available",
        toolCallId: "call_object_1",
        toolName,
        input: object,
      });
      controller.enqueue({ type: "finish-step" });
      controller.enqueue({ type: "finish" });
      controller.close();
    },
  });
  return stream;
}
