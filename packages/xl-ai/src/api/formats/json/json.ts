import { BlockNoteEditor } from "@blocknote/core";
import { CoreMessage, GenerateObjectResult, StreamObjectResult } from "ai";

import {
  promptManipulateDocumentUseJSONSchema,
  promptManipulateSelectionJSONSchema,
} from "../../prompts/jsonSchemaPrompts.js";
import { blockNoteSchemaToJSONSchema } from "../../schema/schemaToJSONSchema.js";

import {
  getApplySuggestionsTr,
  rebaseTool,
} from "../../../prosemirror/rebaseTool.js";
import {
  ApplyOperationResult,
  applyOperations,
} from "../../executor/streamOperations/applyOperations.js";
import { duplicateInsertsToUpdates } from "../../executor/streamOperations/duplicateInsertsToUpdates.js";

import { PromptOrMessages } from "../../index.js";
import {
  LLMRequestOptions,
  callLLMWithStreamTools,
} from "../../streamTool/callLLMWithStreamTools.js";
import { StreamTool } from "../../streamTool/streamTool.js";
import {
  AsyncIterableStream,
  createAsyncIterableStreamFromAsyncIterable,
} from "../../util/stream.js";
import { tools } from "./tools/index.js";

// Define the return type for streaming mode
type ReturnType = {
  toolCallsStream: AsyncIterableStream<ApplyOperationResult<any>>;
  llmResult: StreamObjectResult<any, any, any> | GenerateObjectResult<any>;
  apply: () => Promise<void>;
};

type DefaultTools = Array<
  (typeof tools)["add"] | (typeof tools)["update"] | (typeof tools)["delete"]
>;

export async function callLLM<T extends StreamTool<any>[] = DefaultTools>(
  editor: BlockNoteEditor<any, any, any>,
  opts: Omit<LLMRequestOptions, "messages"> & PromptOrMessages,
  streamTools?: T
): Promise<ReturnType> {
  const { prompt, useSelection, stream = true, ...rest } = opts;

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

  streamTools = streamTools ?? ([tools.add, tools.update, tools.delete] as T);

  const response = await callLLMWithStreamTools(
    editor,
    {
      ...rest,
      messages,
      stream,
    },
    streamTools,
    blockNoteSchemaToJSONSchema(editor.schema).$defs as any
  );

  const operationsToApply = stream
    ? duplicateInsertsToUpdates(response.toolCallsStream)
    : response.toolCallsStream;

  const resultGenerator = applyOperations(
    editor,
    operationsToApply,
    async () => rebaseTool(editor, getApplySuggestionsTr(editor)),
    {
      withDelays: false, // TODO: make configurable
    }
  );

  return {
    llmResult: response.llmResult,
    toolCallsStream:
      createAsyncIterableStreamFromAsyncIterable(resultGenerator),
    // TODO: make it easy to add your own "applyOperations" function
    async apply() {
      /* eslint-disable-next-line */
      for await (const _result of resultGenerator) {
        // no op
      }
    },
  };
}
