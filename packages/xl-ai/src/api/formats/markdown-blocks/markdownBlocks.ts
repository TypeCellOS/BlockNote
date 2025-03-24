import {
  BlockNoteEditor,
  PartialBlock,
  UnreachableCaseError,
} from "@blocknote/core";
import {
  CoreMessage,
  GenerateObjectResult,
  LanguageModel,
  StreamObjectResult,
  generateObject,
  jsonSchema,
  streamObject,
} from "ai";

import type { PromptOrMessages } from "../../index.js";
import { promptManipulateSelectionJSONSchema } from "../../prompts/jsonSchemaPrompts.js";
import { createOperationsArraySchema } from "../../schema/operations.js";

import {
  ApplyOperationResult,
  applyOperations,
} from "../../executor/streamOperations/applyOperations.js";
import { promptManipulateDocumentUseMarkdownBlocks } from "../../prompts/markdownBlocksPrompt.js";
import {
  AsyncIterableStream,
  asyncIterableToStream,
  createAsyncIterableStream,
} from "../../util/stream.js";

import {
  getLLMResponseNonStreaming,
  getLLMResponseStreaming,
} from "../../executor/execute.js";
import { duplicateInsertsToUpdates } from "../../executor/streamOperations/duplicateInsertsToUpdates.js";
import { BlockNoteOperation } from "../../functions/blocknoteFunctions.js";
import { DeleteFunction } from "../../functions/delete.js";

import {
  AIFunctionMD,
  AddFunctionMD,
  UpdateFunctionMD,
} from "./functions/index.js";

type LLMRequestOptions = {
  model: LanguageModel;
  functions: AIFunctionMD[];
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
  resultStream: AsyncIterableStream<ApplyOperationResult>;
  llmResult: StreamObjectResult<any, any, any> | GenerateObjectResult<any>;
  apply: () => Promise<void>;
};

export async function callLLM(
  editor: BlockNoteEditor<any, any, any>,
  opts: CallLLMOptionsWithOptional
): Promise<ReturnType> {
  const { prompt, useSelection, ...rest } = opts;

  let messages: CoreMessage[];

  // changed
  const doc = await Promise.all(
    editor.document.map(async (block) => {
      return {
        id: block.id + "$",
        block: (await editor.blocksToMarkdownLossy([block])).trim(),
      };
    })
  );

  if ("messages" in opts && opts.messages) {
    messages = opts.messages;
  } else if (useSelection) {
    messages = promptManipulateSelectionJSONSchema({
      editor,
      userPrompt: opts.prompt!,
      document: editor.getDocumentWithSelectionMarkers(),
    });
  } else {
    messages = promptManipulateDocumentUseMarkdownBlocks({
      editor,
      userPrompt: opts.prompt!,
      markdown: JSON.stringify(doc),
    });
  }

  const options: LLMRequestOptions = {
    functions: [
      new UpdateFunctionMD(),
      new AddFunctionMD(),
      new DeleteFunction(),
    ],
    stream: true,
    messages,
    maxRetries: 2,
    ...rest,
  };

  // changed
  const schema = jsonSchema({
    ...createOperationsArraySchema(options.functions),
    $defs: {
      block: {
        type: "string",
        description: "markdown of block",
      },
    },
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

  const blockNoteOperationsSource = toBlockNoteOperations(
    editor,
    operationsSource
  );

  const operationsToApply = options.stream
    ? duplicateInsertsToUpdates(blockNoteOperationsSource)
    : blockNoteOperationsSource;

  const resultGenerator = applyOperations(editor, operationsToApply);

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

export async function* toBlockNoteOperations(
  editor: BlockNoteEditor<any, any, any>,
  operationsSource: AsyncIterable<{
    operation: BlockNoteOperation<string>;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }>
): AsyncGenerator<{
  operation: BlockNoteOperation<PartialBlock<any, any, any>>;
  isUpdateToPreviousOperation: boolean;
  isPossiblyPartial: boolean;
}> {
  for await (const chunk of operationsSource) {
    if (chunk.operation.type === "add") {
      const blocks = await Promise.all(
        chunk.operation.blocks.map(async (md) => {
          const block = (await editor.tryParseMarkdownToBlocks(md.trim()))[0]; // TODO: trim
          delete (block as any).id;
          return block;
        })
      );

      // hacky
      if ((window as any).__TEST_OPTIONS) {
        (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS.mockID = 0;
      }

      yield {
        ...chunk,
        operation: {
          ...chunk.operation,
          blocks,
        },
      };
    } else if (chunk.operation.type === "update") {
      const block = (
        await editor.tryParseMarkdownToBlocks(chunk.operation.block.trim())
      )[0];

      // hacky
      if ((window as any).__TEST_OPTIONS) {
        (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS.mockID = 0;
      }

      yield {
        ...chunk,
        operation: {
          ...chunk.operation,
          block,
        },
      };
    } else if (chunk.operation.type === "delete") {
      yield {
        ...chunk,
        operation: chunk.operation,
      };
    } else {
      throw new UnreachableCaseError(chunk.operation);
    }
  }
}
