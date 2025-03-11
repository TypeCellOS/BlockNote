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

import {
  AsyncIterableStream,
  asyncIterableToStream,
  createAsyncIterableStream,
} from "../../util/stream.js";

type BasicLLMRequestOptions = {
  model: LanguageModel;
  functions: AIFunction[];
} & PromptOrMessages;

type StreamLLMRequestOptions = {
  stream: true;
  _streamObjectOptions?: Partial<Parameters<typeof streamObject<any>>[0]>;
};

type NoStreamLLMRequestOptions = {
  stream: false;
  _generateObjectOptions?: Partial<Parameters<typeof generateObject<any>>[0]>;
};

type CallLLMOptions = BasicLLMRequestOptions &
  (StreamLLMRequestOptions | NoStreamLLMRequestOptions);

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type CallLLMOptionsWithOptional = Optional<
  CallLLMOptions,
  "functions" | "stream"
>;

// Define the return type for streaming mode
type ReturnType = {
  resultStream: AsyncIterableStream<ExecuteOperationResult>;
  llmResult: StreamObjectResult<any, any, any> | GenerateObjectResult<any>;
};

async function getLLMResponse(
  baseParams: {
    model: LanguageModel;
    mode: "tool";
    schema: any;
    messages: CoreMessage[];
  },
  options: CallLLMOptions
): Promise<{
  result: ReturnType["llmResult"];
  operationsSource: AsyncIterable<{ operations?: any[] }>;
}> {
  if (options.stream) {
    const ret = streamObject<{ operations: any[] }>({
      ...baseParams,
      ...(options._streamObjectOptions as any),
    });

    return {
      result: ret,
      operationsSource: ret.partialObjectStream,
    };
  }

  const ret = await generateObject<{ operations: any[] }>({
    ...baseParams,
    ...(options._generateObjectOptions as any),
  });

  if (!ret.object.operations) {
    throw new Error("No operations returned");
  }

  async function* singleChunkGenerator() {
    yield { operations: ret.object.operations };
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

  const options: CallLLMOptions = {
    functions: [updateFunction, addFunction, deleteFunction],
    stream: true,
    messages,
    ...rest,
  };

  const schema = jsonSchema({
    ...createOperationsArraySchema(options.functions),
    $defs: blockNoteSchemaToJSONSchema(editor.schema).$defs as any,
  });

  const baseParams = {
    model: options.model,
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
  };
}
