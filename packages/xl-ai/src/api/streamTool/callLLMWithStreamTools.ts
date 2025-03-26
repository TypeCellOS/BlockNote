import {
  CoreMessage,
  GenerateObjectResult,
  LanguageModel,
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
  jsonSchemaDefs?: { [key: string]: JSONSchema7Definition }
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

  const getResponseOptions = {
    ...options,
    mode: "tool" as const,
    schema,
  };

  const { result, operationsSource } = options.stream
    ? await getLLMResponseStreaming(streamTools, getResponseOptions, editor)
    : await getLLMResponseNonStreaming(streamTools, getResponseOptions, editor);

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
  editor: BlockNoteEditor<any, any, any>
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
    // TODO: handle onerror etc?
  });

  return {
    result: ret,
    operationsSource: preprocessOperationsStreaming(
      editor,
      filterNewOrUpdatedOperations(ret.partialObjectStream),
      streamTools
    ),
  };
}
