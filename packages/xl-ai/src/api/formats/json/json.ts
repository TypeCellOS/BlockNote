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
  promptManipulateDocumentUseJSONSchema,
  promptManipulateSelectionJSONSchema,
} from "../../prompts/jsonSchemaPrompts.js";
import { createOperationsArraySchema } from "../../schema/operations.js";
import { blockNoteSchemaToJSONSchema } from "../../schema/schemaToJSONSchema.js";

import {
  getApplySuggestionsTr,
  rebaseTool,
} from "../../../prosemirror/rebaseTool.js";
import {
  getLLMResponseNonStreaming,
  getLLMResponseStreaming,
} from "../../executor/execute.js";
import {
  ApplyOperationResult,
  applyOperations,
} from "../../executor/streamOperations/applyOperations.js";
import { duplicateInsertsToUpdates } from "../../executor/streamOperations/duplicateInsertsToUpdates.js";
import { DeleteFunction } from "../../functions/delete.js";
import { PromptOrMessages } from "../../index.js";
import {
  AsyncIterableStream,
  asyncIterableToStream,
  createAsyncIterableStream,
} from "../../util/stream.js";
import {
  AIFunctionJSON,
  AddFunctionJSON,
  UpdateFunctionJSON,
} from "./functions/index.js";

type LLMRequestOptions = {
  model: LanguageModel;
  functions: AIFunctionJSON[];
  stream: boolean;
  maxRetries: number;
  _generateObjectOptions?: Partial<Parameters<typeof generateObject<any>>[0]>;
  _streamObjectOptions?: Partial<Parameters<typeof streamObject<any>>[0]>;
};

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type CallLLMOptionsWithOptional = Optional<
  LLMRequestOptions,
  "functions" | "stream" | "maxRetries"
>;

// Define the return type for streaming mode
type ReturnType = {
  resultStream: AsyncIterableStream<ApplyOperationResult>;
  llmResult: StreamObjectResult<any, any, any> | GenerateObjectResult<any>;
  apply: () => Promise<void>;
};

export async function callLLM(
  editor: BlockNoteEditor<any, any, any>,
  opts: CallLLMOptionsWithOptional & PromptOrMessages
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
    functions: [
      new UpdateFunctionJSON(),
      new AddFunctionJSON(),
      new DeleteFunction(),
    ],
    stream: true,
    messages,
    maxRetries: 2,
    ...rest,
  };

  const schema = jsonSchema({
    ...createOperationsArraySchema(options.functions),
    $defs: blockNoteSchemaToJSONSchema(editor.schema).$defs as any,
  });

  const getResponseOptions = {
    ...options,
    mode: "tool" as const,
    schema,
    messages,
  };

  const { result, operationsSource } = options.stream
    ? await getLLMResponseStreaming(getResponseOptions, editor)
    : await getLLMResponseNonStreaming(getResponseOptions, editor);

  const operationsToApply = options.stream
    ? duplicateInsertsToUpdates(operationsSource)
    : operationsSource;

  const resultGenerator = applyOperations(
    editor,
    operationsToApply,
    async () => rebaseTool(editor, getApplySuggestionsTr(editor)),
    {
      withDelays: false, // TODO: make configurable
    }
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
