import { getErrorMessage } from "@ai-sdk/provider-utils";
import {
  DeepPartial,
  isDeepEqualData,
  ObjectStreamPart,
  parsePartialJson,
  readUIMessageStream,
  UIMessageChunk,
} from "ai";

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

export function dataStreamToTextStream(stream: ReadableStream<UIMessageChunk>) {
  let errored = false;
  const textStream = new ReadableStream({
    start(controller) {
      readUIMessageStream({
        stream,
        onTextPart: (chunk: any) => {
          controller.enqueue(chunk);
        },
        onErrorPart: (chunk: any) => {
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
        (error: any) => {
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
