import {
  CoreMessage,
  GenerateObjectResult,
  LanguageModel,
  ObjectStreamPart,
  StreamObjectResult,
  generateObject,
  jsonSchema,
  streamObject,
} from "ai";

import { createStreamToolsArraySchema } from "./jsonSchema.js";

import {
  AsyncIterableStream,
  createAsyncIterableStream,
  createAsyncIterableStreamFromAsyncIterable,
} from "../util/stream.js";
import { filterNewOrUpdatedOperations } from "./filterNewOrUpdatedOperations.js";
import {
  preprocessOperationsNonStreaming,
  preprocessOperationsStreaming,
} from "./preprocess.js";
import { Result, StreamTool, StreamToolCall } from "./streamTool.js";

type LLMRequestOptions = {
  model: LanguageModel;
  messages: CoreMessage[];
  maxRetries: number;
};

/**
 * Result of an LLM call with stream tools
 */
export type OperationsResult<T extends StreamTool<any>[]> = {
  /**
   * Result of the underlying `streamObject` (AI SDK) call, or `undefined` if non-streaming mode
   */
  streamObjectResult: StreamObjectResult<any, any, any> | undefined;
  /**
   * Result of the underlying `generateObject` (AI SDK) call, or `undefined` if streaming mode
   */
  generateObjectResult: GenerateObjectResult<any> | undefined;
  /**
   * Stream of tool call operations, these are the operations the LLM "decided" to execute
   *
   * Calling this consumes the underlying streams
   */
  operationsSource: AsyncIterableStream<{
    /**
     * The operation the LLM wants to execute
     */
    operation: StreamToolCall<T>;
    /**
     * Whether {@link operation} is an update to the previous operation in the stream.
     *
     * For non-streaming mode, this will always be `false`
     */
    isUpdateToPreviousOperation: boolean;
    /**
     * Whether the {@link operation} is possibly partial (i.e. the LLM is still streaming data about this operation)
     *
     * For non-streaming mode, this will always be `false`
     */
    isPossiblyPartial: boolean;
  }>;
  /**
   * All tool call operations the LLM decided to execute
   */
  getGeneratedOperations: () => Promise<{
    operations: StreamToolCall<T>[];
  }>;
};

/**
 * Calls an LLM with StreamTools, using the `generateObject` of the AI SDK.
 *
 * This is the non-streaming version.
 */
export async function generateOperations<T extends StreamTool<any>[]>(
  streamTools: T,
  opts: LLMRequestOptions & {
    _generateObjectOptions?: Partial<Parameters<typeof generateObject<any>>[0]>;
  },
): Promise<OperationsResult<T>> {
  const { _generateObjectOptions, ...rest } = opts;

  if (
    _generateObjectOptions &&
    ("output" in _generateObjectOptions || "schema" in _generateObjectOptions)
  ) {
    throw new Error(
      "Cannot provide output or schema in _generateObjectOptions",
    );
  }

  const schema = jsonSchema(createStreamToolsArraySchema(streamTools));
  const options = {
    // non-overridable options for streamObject
    output: "object" as const,
    schema,

    // configurable options for streamObject

    // - optional, with defaults

    // mistral somehow needs "auto", while groq/llama needs "tool"
    // google needs "auto" because https://github.com/vercel/ai/issues/6959
    // TODO: further research this and / or make configurable
    // for now stick to "tool" by default as this has been tested mostly
    mode:
      rest.model.provider === "mistral.chat" ||
      rest.model.provider === "google.generative-ai"
        ? "auto"
        : "tool",
    //  - mandatory ones:
    ...rest,

    // extra options for streamObject
    ...((_generateObjectOptions ?? {}) as any),
  };

  const ret = await generateObject<{ operations: any }>(options);

  // because the rest of the codebase always expects a stream, we convert the object to a stream here
  const stream = operationsToStream(ret.object);

  if (!stream.ok) {
    throw new Error(stream.error);
  }

  let _operationsSource: OperationsResult<T>["operationsSource"];

  return {
    streamObjectResult: undefined,
    generateObjectResult: ret,
    get operationsSource() {
      if (!_operationsSource) {
        _operationsSource = createAsyncIterableStreamFromAsyncIterable(
          preprocessOperationsNonStreaming(stream.value, streamTools),
        );
      }
      return _operationsSource;
    },
    async getGeneratedOperations() {
      return ret.object;
    },
  };
}

export function operationsToStream<T extends StreamTool<any>[]>(
  object: unknown,
): Result<
  AsyncIterable<{
    partialOperation: StreamToolCall<T>;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }>
> {
  if (
    !object ||
    typeof object !== "object" ||
    !("operations" in object) ||
    !Array.isArray(object.operations)
  ) {
    return {
      ok: false,
      error: "No operations returned",
    };
  }
  const operations = object.operations;
  async function* singleChunkGenerator() {
    for (const op of operations) {
      yield {
        partialOperation: op,
        isUpdateToPreviousOperation: false,
        isPossiblyPartial: false,
      };
    }
  }

  return {
    ok: true,
    value: singleChunkGenerator(),
  };
}

/**
 * Calls an LLM with StreamTools, using the `streamObject` of the AI SDK.
 *
 * This is the streaming version.
 */
export async function streamOperations<T extends StreamTool<any>[]>(
  streamTools: T,
  opts: LLMRequestOptions & {
    _streamObjectOptions?: Partial<
      Parameters<typeof streamObject<{ operations: any[] }>>[0]
    >;
  },
  onStart: () => void = () => {
    // noop
  },
): Promise<OperationsResult<T>> {
  const { _streamObjectOptions, ...rest } = opts;

  if (
    _streamObjectOptions &&
    ("output" in _streamObjectOptions || "schema" in _streamObjectOptions)
  ) {
    throw new Error("Cannot provide output or schema in _streamObjectOptions");
  }

  const schema = jsonSchema(createStreamToolsArraySchema(streamTools));

  const options = {
    // non-overridable options for streamObject
    output: "object" as const,
    schema,
    // configurable options for streamObject

    // - optional, with defaults
    // mistral somehow needs "auto", while groq/llama needs "tool"
    // google needs "auto" because https://github.com/vercel/ai/issues/6959
    // TODO: further research this and / or make configurable
    // for now stick to "tool" by default as this has been tested mostly
    mode:
      rest.model.provider === "mistral.chat" ||
      rest.model.provider === "google.generative-ai"
        ? "auto"
        : "tool",
    //  - mandatory ones:
    ...rest,

    // extra options for streamObject
    ...((opts._streamObjectOptions ?? {}) as any),
  };

  const ret = streamObject<{ operations: any }>(options);

  let _operationsSource: OperationsResult<T>["operationsSource"];

  const [fullStream1, fullStream2] = ret.fullStream.tee();

  // Always consume fullStream2 in the background and store the last operations
  const allOperationsPromise = (async () => {
    let lastOperations: { operations: StreamToolCall<T>[] } = {
      operations: [],
    };
    const objectStream = createAsyncIterableStream(
      partialObjectStream(fullStream2),
    );

    for await (const chunk of objectStream) {
      if (chunk && typeof chunk === "object" && "operations" in chunk) {
        lastOperations = chunk as any;
      }
    }
    return lastOperations;
  })();

  // Note: we can probably clean this up by switching to streams instead of async iterables
  return {
    streamObjectResult: ret,
    generateObjectResult: undefined,
    get operationsSource() {
      if (!_operationsSource) {
        _operationsSource = createAsyncIterableStreamFromAsyncIterable(
          preprocessOperationsStreaming(
            filterNewOrUpdatedOperations(
              streamOnStartCallback(
                partialObjectStreamThrowError(
                  createAsyncIterableStream(fullStream1),
                ),
                onStart,
              ),
            ),
            streamTools,
          ),
        );
      }
      return _operationsSource;
    },
    async getGeneratedOperations() {
      // Simply return the stored operations
      // If the stream hasn't completed yet, this will return the latest available operations
      return allOperationsPromise;
    },
  };
}

async function* streamOnStartCallback<T>(
  stream: AsyncIterable<T>,
  onStart: () => void,
): AsyncIterable<T> {
  let first = true;
  for await (const chunk of stream) {
    if (first) {
      onStart();
      first = false;
    }
    yield chunk;
  }
}

// adapted from https://github.com/vercel/ai/blob/5d4610634f119dc394d36adcba200a06f850209e/packages/ai/core/generate-object/stream-object.ts#L1041C7-L1066C1
// change made to throw errors (with the original they're silently ignored)
function partialObjectStreamThrowError<PARTIAL>(
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
function partialObjectStream<PARTIAL>(
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
