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

import { BlockNoteEditor } from "@blocknote/core";
import { JSONSchema7Definition } from "json-schema";
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
import { StreamTool, StreamToolCall } from "./streamTool.js";

type LLMRequestOptionsInternal = {
  model: LanguageModel;
  messages: CoreMessage[];
  stream: boolean;
  maxRetries: number;
  _generateObjectOptions?: Partial<Parameters<typeof generateObject<any>>[0]>;
  _streamObjectOptions?: Partial<Parameters<typeof streamObject<any>>[0]>;
};

export type LLMRequestOptions = Optional<
  LLMRequestOptionsInternal,
  "stream" | "maxRetries"
>;

// Define the return type for streaming mode
type ReturnType<T extends StreamTool<any>[]> = {
  toolCallsStream: AsyncIterableStream<{
    operation: StreamToolCall<T>;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }>;
  llmResult: StreamObjectResult<any, any, any> | GenerateObjectResult<any>;
};

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export async function callLLMWithStreamTools<T extends StreamTool<any>[]>(
  editor: BlockNoteEditor<any, any, any>,
  opts: LLMRequestOptions,
  streamTools: T,
  jsonSchemaDefs?: { [key: string]: JSONSchema7Definition },
  onStart?: () => void
): Promise<ReturnType<T>> {
  const options = {
    stream: true,
    maxRetries: 2,
    ...opts,
  };

  const schema = jsonSchema({
    ...createStreamToolsArraySchema(streamTools),
    $defs: jsonSchemaDefs,
  });
  // console.log(JSON.stringify(schema.jsonSchema, null, 2));
  const getResponseOptions = {
    ...options,
    mode: "tool" as const,
    schema,
  };

  const { result, operationsSource } = options.stream
    ? await getLLMResponseStreaming(
        streamTools,
        getResponseOptions,
        editor,
        onStart
      )
    : await getLLMResponseNonStreaming(streamTools, getResponseOptions, editor);

  if (!options.stream) {
    onStart?.();
  }

  return {
    llmResult: result,
    toolCallsStream:
      createAsyncIterableStreamFromAsyncIterable(operationsSource),
  };
}

async function getLLMResponseNonStreaming<T extends StreamTool<any>[]>(
  streamTools: T,
  options: LLMRequestOptionsInternal & { schema: any },
  editor: BlockNoteEditor<any, any, any>
): Promise<{
  result: GenerateObjectResult<any>;
  operationsSource: AsyncIterable<{
    operation: StreamToolCall<T>;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }>;
}> {
  if (options.stream) {
    throw new Error("Cannot provide stream: true when not streaming");
  }

  if (options._streamObjectOptions) {
    throw new Error("Cannot provide _streamObjectOptions when not streaming");
  }

  const ret = await generateObject<{ operations: any[] }>({
    ...options,
    ...(options._generateObjectOptions as any),
  });

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
      editor,
      singleChunkGenerator(),
      streamTools
    ),
  };
}

async function getLLMResponseStreaming<T extends StreamTool<any>[]>(
  streamTools: T,
  options: LLMRequestOptionsInternal & { schema: any },
  editor: BlockNoteEditor<any, any, any>,
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
  if (!options.stream) {
    throw new Error("Cannot provide stream: false when streaming");
  }
  if (options._generateObjectOptions) {
    throw new Error("Cannot provide _generateObjectOptions when streaming");
  }
  const ret = streamObject<{ operations: any[] }>({
    ...options,
    ...(options._streamObjectOptions as any),
  });

  return {
    result: ret,
    operationsSource: preprocessOperationsStreaming(
      editor,
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
