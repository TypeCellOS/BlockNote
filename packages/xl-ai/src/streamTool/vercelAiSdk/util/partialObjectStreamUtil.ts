import { getErrorMessage } from "@ai-sdk/provider-utils";
import {
  DeepPartial,
  isDeepEqualData,
  ObjectStreamPart,
  parsePartialJson,
  readUIMessageStream,
  UIMessageChunk,
} from "ai";

/**
 * This file contains some helper functions to convert between object generation (streaming and non-streaming)
 * and UI Message streams and vice versa.
 *
 * Normally, the AI SDK uses a TextStream to transport generated objects / object streams.
 * However, this does not work well with error handling (TODO: validate this).
 *
 * See:
 *
 * @see https://github.com/vercel/ai/issues/5027#issuecomment-2701011869
 * @see https://github.com/vercel/ai/issues/5115
 *
 * Therefor, we convert the object (streams) to the UIMessageStream format that's also used by streamText / generateText
 */

/**
 * FUNCTIONS TO CONVERT FROM UIMESSAGESTREAM TO OBJECT (STREAMS))
 */

// based on https://github.com/vercel/ai/blob/d8ada0eb81e42633172d739a40c88e6c5a2f426b/packages/react/src/use-object.ts#L202
export function textStreamToPartialObjectStream<T>() {
  let accumulatedText = "";
  let latestObject: DeepPartial<T> | undefined = undefined;
  return new TransformStream<string, DeepPartial<T>>({
    transform: async (chunk, controller) => {
      accumulatedText += chunk;
      const { value } = await parsePartialJson(accumulatedText);
      const currentObject = value as DeepPartial<T>;

      if (!isDeepEqualData(latestObject, currentObject)) {
        latestObject = currentObject;

        controller.enqueue(currentObject);
      }
    },
  });
}

export function uiMessageStreamObjectDataToTextStream(
  stream: ReadableStream<UIMessageChunk>,
) {
  let errored = false;
  const textStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of readUIMessageStream({
        stream,
        onError: (error: any) => {
          errored = true;
          controller.error(error);
        },
        terminateOnError: true,
      })) {
        for (const part of chunk.parts) {
          switch (part.type) {
            case "data-object-delta":
              controller.enqueue(part.data);
              break;
          }
        }
      }
      if (!errored) {
        controller.close();
      }
    },
  });
  return textStream;
}

/**
 * FUNCTIONS TO CONVERT FROM OBJECT (STREAMS) TO UIMESSAGESTREAM
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
export function partialObjectStreamToUIMessageStream<PARTIAL>(
  stream: ReadableStream<ObjectStreamPart<PARTIAL>>,
): ReadableStream<UIMessageChunk> {
  return stream.pipeThrough(
    new TransformStream({
      start(controller) {
        controller.enqueue({ type: "start" });
        controller.enqueue({ type: "start-step" });
        // controller.enqueue({ type: "text-start", id: "text-1" });
      },
      transform(chunk, controller) {
        switch (chunk.type) {
          case "text-delta":
            controller.enqueue({
              type: "data-object-delta",
              id: "text-1",
              data: chunk.textDelta,
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
        controller.enqueue({ type: "finish-step" });
        controller.enqueue({ type: "finish" });
      },
    }),
  );
}

// convert a plain object to a UIMessageStream.
export function objectToUIMessageStream(object: any) {
  const stream = new ReadableStream<UIMessageChunk>({
    start(controller) {
      controller.enqueue({ type: "start" });
      controller.enqueue({ type: "start-step" });
      // controller.enqueue({ type: "data-object-start", id: "text-1" });
      controller.enqueue({
        type: "data-object-delta",
        id: "text-1",
        data: JSON.stringify(object),
      });
      // controller.enqueue({ type: "text-end", id: "text-1" });
      controller.enqueue({ type: "finish-step" });
      controller.enqueue({ type: "finish" });
      controller.close();
    },
  });
  return stream;
}
