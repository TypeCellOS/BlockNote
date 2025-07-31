import { getErrorMessage } from "@ai-sdk/provider-utils";
import {
  formatDataStreamPart,
  isDeepEqualData,
  parsePartialJson,
  processDataStream,
} from "@ai-sdk/ui-utils";
import { DeepPartial, ObjectStreamPart } from "ai";
import {
  AsyncIterableStream,
  createAsyncIterableStream,
} from "../../../util/stream.js";

// adapted from https://github.com/vercel/ai/blob/5d4610634f119dc394d36adcba200a06f850209e/packages/ai/core/generate-object/stream-object.ts#L1041C7-L1066C1
// change made to throw errors (with the original they're silently ignored)
export function partialObjectStreamThrowError_UNUSED<PARTIAL>(
  stream: ReadableStream<ObjectStreamPart<PARTIAL>>,
): AsyncIterableStream<PARTIAL> {
  return createAsyncIterableStream(
    stream.pipeThrough(
      new TransformStream<ObjectStreamPart<PARTIAL>, PARTIAL>({
        transform(chunk, controller) {
          switch (chunk.type) {
            case "object":
              controller.enqueue(chunk.object);
              break;

            case "text-delta":
            case "finish":
              break;
            case "error":
              controller.error(chunk.error);
              break;
            default: {
              const _exhaustiveCheck: never = chunk;
              throw new Error(`Unsupported chunk type: ${_exhaustiveCheck}`);
            }
          }
        },
      }),
    ),
  );
}

// from https://github.com/vercel/ai/blob/5d4610634f119dc394d36adcba200a06f850209e/packages/ai/core/generate-object/stream-object.ts#L1041C7-L1066C1
export function partialObjectStream_UNUSED<PARTIAL>(
  stream: ReadableStream<ObjectStreamPart<PARTIAL>>,
): AsyncIterableStream<PARTIAL> {
  return createAsyncIterableStream(
    stream.pipeThrough(
      new TransformStream<ObjectStreamPart<PARTIAL>, PARTIAL>({
        transform(chunk, controller) {
          switch (chunk.type) {
            case "object":
              controller.enqueue(chunk.object);
              break;
            case "text-delta":
            case "finish":
              break;
            case "error":
              break;
            default: {
              const _exhaustiveCheck: never = chunk;
              throw new Error(`Unsupported chunk type: ${_exhaustiveCheck}`);
            }
          }
        },
      }),
    ),
  );
}

// based on https://github.com/vercel/ai/blob/d383c37072a91dfd0cebac13893dea044d9f88fa/packages/react/src/use-object.ts#L185
export function textStreamToPartialObjectStream<T>() {
  let accumulatedText = "";
  let latestObject: DeepPartial<T> | undefined = undefined;
  return new TransformStream<string, DeepPartial<T>>({
    transform(chunk, controller) {
      accumulatedText += chunk;
      const { value } = parsePartialJson(accumulatedText);
      const currentObject = value as DeepPartial<T>;

      if (!isDeepEqualData(latestObject, currentObject)) {
        latestObject = currentObject;

        controller.enqueue(currentObject);
      }
    },
  });
}

export function dataStreamToTextStream(stream: ReadableStream<Uint8Array>) {
  let errored = false;
  const textStream = new ReadableStream({
    start(controller) {
      processDataStream({
        stream,
        onTextPart: (chunk) => {
          controller.enqueue(chunk);
        },
        onErrorPart: (chunk) => {
          errored = true;
          controller.error(chunk);
          // console.log("error", chunk);
        },
      }).then(
        () => {
          if (!errored) {
            controller.close();
          }
        },
        (error) => {
          controller.error(error);
        },
      );
    },
  });
  return textStream;
}

/**
 * Transforms a partial object stream to a data stream format.
 * This is needed to pass errors through to the client in a clean way.
 *
 * @param stream - The partial object stream to transform
 * @returns A ReadableStream that emits data stream formatted chunks
 *
 * @see https://github.com/vercel/ai/issues/5027#issuecomment-2701011869
 * @see https://github.com/vercel/ai/issues/5115
 */
export function partialObjectStreamToDataStream<PARTIAL>(
  stream: ReadableStream<ObjectStreamPart<PARTIAL>>,
): ReadableStream<string> {
  return stream.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        switch (chunk.type) {
          case "text-delta":
            controller.enqueue(formatDataStreamPart("text", chunk.textDelta));
            break;
          case "object":
          case "finish":
            break;
          case "error":
            controller.enqueue(
              formatDataStreamPart("error", getErrorMessage(chunk.error)),
            );
            break;
          default: {
            const _exhaustiveCheck: never = chunk;
            throw new Error(`Unsupported chunk type: ${_exhaustiveCheck}`);
          }
        }
      },
    }),
  );
}

export function objectToDataStream(object: any) {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(formatDataStreamPart("text", JSON.stringify(object)));
      controller.close();
    },
  });
  return stream;
}
