import { BlockNoteEditor } from "@blocknote/core";
import {
  CoreMessage,
  GenerateObjectResult,
  LanguageModel,
  StreamObjectResult,
  generateObject,
  jsonSchema,
  streamObject,
} from "ai";

import {
  ExecuteOperationResult,
  executeOperations,
} from "../../executor/executor.js";
import { addFunction } from "../../functions/add.js";
import { deleteFunction } from "../../functions/delete.js";
import { AIFunction } from "../../functions/index.js";
import { updateFunction } from "../../functions/update.js";
import type { PromptOrMessages } from "../../index.js";
import {
  promptManipulateDocumentUseJSONSchema,
  promptManipulateSelectionJSONSchema,
} from "../../prompts/jsonSchemaPrompts.js";
import { createOperationsArraySchema } from "../../schema/operations.js";
import { blockNoteSchemaToJSONSchema } from "../../schema/schemaToJSONSchema.js";

import { filterNewOrUpdatedOperations } from "../../executor/streamOperations/filterNewOrUpdatedOperations.js";
import {
  AsyncIterableStream,
  asyncIterableToStream,
  createAsyncIterableStream,
} from "../../util/stream.js";

type LLMRequestOptions = {
  model: LanguageModel;
  functions: AIFunction[];
  stream: boolean;
  maxRetries: number;
  _generateObjectOptions?: Partial<Parameters<typeof generateObject<any>>[0]>;
  _streamObjectOptions?: Partial<Parameters<typeof streamObject<any>>[0]>;
} & PromptOrMessages;

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type CallLLMOptionsWithOptional = Optional<
  LLMRequestOptions,
  "functions" | "stream" | "maxRetries"
>;

// Define the return type for streaming mode
type ReturnType = {
  resultStream: AsyncIterableStream<ExecuteOperationResult>;
  llmResult: StreamObjectResult<any, any, any> | GenerateObjectResult<any>;
  apply: () => Promise<void>;
};

async function getLLMResponse(
  baseParams: {
    model: LanguageModel;
    mode: "tool";
    schema: any;
    messages: CoreMessage[];
    maxRetries: number;
  },
  options: LLMRequestOptions
): Promise<{
  result: ReturnType["llmResult"];
  operationsSource: AsyncIterable<{
    partialOperation: any;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }>;
}> {
  if (options.stream) {
    if (options._generateObjectOptions) {
      throw new Error("Cannot provide _generateObjectOptions when streaming");
    }
    const ret = streamObject<{ operations: any[] }>({
      ...baseParams,
      ...(options._streamObjectOptions as any),
    });

    return {
      result: ret,
      operationsSource: filterNewOrUpdatedOperations(ret.partialObjectStream),
    };
  }

  if (options._streamObjectOptions) {
    throw new Error("Cannot provide _streamObjectOptions when not streaming");
  }

  const ret = await generateObject<{ operations: any[] }>({
    ...baseParams,
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
    operationsSource: singleChunkGenerator(),
  };
}

export async function callLLM(
  editor: BlockNoteEditor<any, any, any>,
  opts: CallLLMOptionsWithOptional
): Promise<ReturnType> {
  const { prompt, useSelection, ...rest } = opts;

  let messages: CoreMessage[];

  if ("messages" in opts && opts.messages) {
    messages = opts.messages;
  } else if (useSelection) {
    messages = promptManipulateSelectionJSONSchema({
      editor,
      userPrompt: opts.prompt!,
      document: editor.getDocumentWithSelectionMarkers(),
    });
  } else {
    messages = promptManipulateDocumentUseJSONSchema({
      editor,
      userPrompt: opts.prompt!,
      document: editor.document,
    });
  }

  const options: LLMRequestOptions = {
    functions: [updateFunction, addFunction, deleteFunction],
    stream: true,
    messages,
    maxRetries: 2,
    ...rest,
  };

  const schema = jsonSchema({
    ...createOperationsArraySchema(options.functions),
    $defs: blockNoteSchemaToJSONSchema(editor.schema).$defs as any,
  });

  const baseParams = {
    model: options.model,
    maxRetries: options.maxRetries,
    mode: "tool" as const,
    schema,
    messages,
  };

  const { result, operationsSource } = await getLLMResponse(
    baseParams,
    options
  );

  const resultGenerator = executeOperations(
    editor,
    operationsSource,
    options.functions
  );

  // Convert to stream at the API boundary
  const resultStream = asyncIterableToStream(resultGenerator);
  const asyncIterableResultStream = createAsyncIterableStream(resultStream);

  return {
    llmResult: result,
    resultStream: asyncIterableResultStream,
    async apply() {
      /* eslint-disable-next-line */
      for await (const _result of asyncIterableResultStream) {
        // no op
      }
    },
  };
}
