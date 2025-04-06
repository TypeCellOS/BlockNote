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
  createAsyncIterableStream
} from "../util/stream.js";
import { filterNewOrUpdatedOperations } from "./filterNewOrUpdatedOperations.js";
import {
  preprocessOperationsNonStreaming,
  preprocessOperationsStreaming,
} from "./preprocess.js";
import { StreamTool, StreamToolCall } from "./streamTool.js";

type LLMRequestOptionsInternal = {
  model: LanguageModel;
  messages: CoreMessage[];
  maxRetries: number;
};

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type LLMRequestOptions = Optional<
  LLMRequestOptionsInternal,
  "maxRetries"
>;

export async function generateOperations<T extends StreamTool<any>[]>(
  streamTools: T,
  opts: LLMRequestOptions & { _generateObjectOptions?: Partial<Parameters<typeof generateObject<any>>[0]> },
): Promise<{
  result: GenerateObjectResult<{ operations: any }>;
  operationsSource: AsyncIterable<{
    operation: StreamToolCall<T>;
    isUpdateToPreviousOperation: boolean; // TODO: remove?
    isPossiblyPartial: boolean; // TODO: remove?
  }>;
}> {
  const {  _generateObjectOptions, ...rest } = opts;

  if (_generateObjectOptions && ("output" in  _generateObjectOptions || "schema" in _generateObjectOptions || 'mode' in _generateObjectOptions)) {
    throw new Error("Cannot provide output or schema in _generateObjectOptions");
  }

  const schema = jsonSchema(createStreamToolsArraySchema(streamTools));

  const options = {
    // non-overridable options for streamObject
    mode: "tool" as const,
    output: "object" as const,
    schema,
    
    // configurable options for streamObject

    // - optional, with defaults
    maxRetries: 2,
    //  - mandatory ones:
    ...rest,

    // extra options for streamObject
    ...(_generateObjectOptions ?? {}) as any,
  };

  const ret = await generateObject<{ operations: any }>(options);

  if (!ret.object.operations) {
    throw new Error("No operations returned");
  }

  async function* singleChunkGenerator() {
    for (const op of ret.object.operations) {
      // TODO: non-streaming might not need some steps
      // in the executor
      yield {
        partialOperation: op,
        isUpdateToPreviousOperation: false,
        isPossiblyPartial: false,
      };
    }
  }

  return {
    result: ret,
    operationsSource: preprocessOperationsNonStreaming(
      singleChunkGenerator(),
      streamTools
    ),
  };
}

export async function streamOperations<T extends StreamTool<any>[]>(
  streamTools: T,
  opts: LLMRequestOptions & { _streamObjectOptions?: Partial<Parameters<typeof streamObject<{ operations: any[] }>>[0]> },
  onStart: () => void = () => {
    // noop
  }
): Promise<{
  result: StreamObjectResult<any, any, any>;
  operationsSource: AsyncIterable<{
    operation: StreamToolCall<T>;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }>;
}> {
  const {  _streamObjectOptions, ...rest } = opts;

  if (_streamObjectOptions && ("output" in  _streamObjectOptions || "schema" in _streamObjectOptions || 'mode' in _streamObjectOptions)) {
    throw new Error("Cannot provide output or schema in _streamObjectOptions");
  }

  const schema = jsonSchema(createStreamToolsArraySchema(streamTools));

  const options = {
    // non-overridable options for streamObject
    mode: "tool" as const,
    output: "object" as const,
    schema,
    
    // configurable options for streamObject

    // - optional, with defaults
    maxRetries: 2,
    //  - mandatory ones:
    ...rest,

    // extra options for streamObject
    ...(opts._streamObjectOptions ?? {}) as any,
  };

  const ret = streamObject<{ operations: any }>(options);

  return {
    result: ret,
    operationsSource: preprocessOperationsStreaming(
      filterNewOrUpdatedOperations(
        streamOnStartCallback(
          partialObjectStreamThrowError(ret.fullStream),
          onStart
        )
      ),
      streamTools
    ),
  };
}

async function* streamOnStartCallback<T>(
  stream: AsyncIterable<T>,
  onStart: () => void
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
// change made to throw errors
function partialObjectStreamThrowError<PARTIAL>(
  stream: AsyncIterableStream<ObjectStreamPart<PARTIAL>>
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
              throw chunk.error;
            default: {
              const _exhaustiveCheck: never = chunk;
              throw new Error(`Unsupported chunk type: ${_exhaustiveCheck}`);
            }
          }
        },
      })
    )
  );
}
