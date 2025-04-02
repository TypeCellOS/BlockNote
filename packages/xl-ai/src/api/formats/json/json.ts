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
import {
  AsyncIterableStream,
  createAsyncIterableStreamFromAsyncIterable,
} from "../../util/stream.js";
import { tools } from "./tools/index.js";

/**
 * Define the return type for streaming mode
 */
type ReturnType = {
  toolCallsStream: AsyncIterableStream<ApplyOperationResult<any>>;
  llmResult: StreamObjectResult<any, any, any> | GenerateObjectResult<any>;
  apply: () => Promise<void>;
};

/**
 * Calls the LLM with the given options and tools
 *
 * @param editor The BlockNote editor instance
 * @param opts Options for the LLM request
 * @param defaultTools Configuration for which default tools to enable (all are enabled by default)
 * @param streamTools Optional custom stream tools to use instead of the defaults
 */
export async function callLLM(
  editor: BlockNoteEditor<any, any, any>,
  opts: Omit<LLMRequestOptions, "messages"> &
    PromptOrMessages & {
      defaultStreamTools?: {
        /** Enable the add tool (default: true) */
        add?: boolean;
        /** Enable the update tool (default: true) */
        update?: boolean;
        /** Enable the delete tool (default: true) */
        delete?: boolean;
      };
    }
): Promise<ReturnType> {
  const mergedStreamTools = {
    add: true,
    update: true,
    delete: true,
    ...opts.defaultStreamTools,
  };

  const { prompt, useSelection, stream = true, ...rest } = opts;

  let messages: CoreMessage[];

  if ("messages" in opts && opts.messages) {
    messages = opts.messages;
  } else if (useSelection) {
    messages = promptManipulateSelectionJSONSchema({
      userPrompt: opts.prompt!,
      document: editor.getDocumentWithSelectionMarkers(),
    });
  } else {
    messages = promptManipulateDocumentUseJSONSchema({
      userPrompt: opts.prompt!,
      document: editor.document,
    });
  }

  const streamTools = [
    ...(mergedStreamTools.update ? [tools.update] : []),
    ...(mergedStreamTools.add ? [tools.add] : []),
    ...(mergedStreamTools.delete ? [tools.delete] : []),
  ];

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

  const toolCallsStream =
    createAsyncIterableStreamFromAsyncIterable(resultGenerator);

  return {
    llmResult: response.llmResult,
    toolCallsStream,
    // TODO: make it easy to add your own "applyOperations" function
    async apply() {
      /* eslint-disable-next-line */
      for await (const _result of toolCallsStream) {
        // no op
      }
    },
  };
}
