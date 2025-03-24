import { BlockNoteEditor } from "@blocknote/core";
import {
  CoreMessage,
  GenerateObjectResult,
  LanguageModel,
  StreamObjectResult,
  generateObject,
  streamObject,
} from "ai";

import { BlockNoteOperation } from "../functions/blocknoteFunctions.js";
import { LLMFunction } from "../functions/function.js";
import {
  preprocessOperationsNonStreaming,
  preprocessOperationsStreaming,
} from "./preprocess.js";
import { filterNewOrUpdatedOperations } from "./streamOperations/filterNewOrUpdatedOperations.js";

// TODO: move
export async function getLLMResponseNonStreaming<T>(
  options: {
    model: LanguageModel;
    functions: LLMFunction<BlockNoteOperation<T>>[];
    stream: boolean;
    maxRetries: number;
    schema: any;
    messages: CoreMessage[];
    _generateObjectOptions?: Partial<Parameters<typeof generateObject<any>>[0]>;
    _streamObjectOptions?: Partial<Parameters<typeof streamObject<any>>[0]>;
  },
  editor: BlockNoteEditor<any, any, any>
): Promise<{
  result: GenerateObjectResult<any>;
  operationsSource: AsyncIterable<{
    operation: BlockNoteOperation<any>; // TODO
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
      options.functions
    ),
  };
}

// TODO: move
export async function getLLMResponseStreaming<T>(
  options: {
    model: LanguageModel;
    functions: LLMFunction<BlockNoteOperation<T>>[];
    stream: boolean;
    maxRetries: number;
    schema: any;
    messages: CoreMessage[];
    _generateObjectOptions?: Partial<Parameters<typeof generateObject<any>>[0]>;
    _streamObjectOptions?: Partial<Parameters<typeof streamObject<any>>[0]>;
  },
  editor: BlockNoteEditor<any, any, any>
): Promise<{
  result: StreamObjectResult<any, any, any>;
  operationsSource: AsyncIterable<{
    operation: BlockNoteOperation<T>;
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
      options.functions
    ),
  };
}
