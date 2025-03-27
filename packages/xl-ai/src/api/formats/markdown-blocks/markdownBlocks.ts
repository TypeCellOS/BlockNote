import {
  BlockNoteEditor,
  PartialBlock,
  UnreachableCaseError,
  getBlock,
} from "@blocknote/core";
import { CoreMessage, GenerateObjectResult, StreamObjectResult } from "ai";
import { Mapping } from "prosemirror-transform";
import type { PromptOrMessages } from "../../index.js";
import { promptManipulateSelectionJSONSchema } from "../../prompts/jsonSchemaPrompts.js";

import {
  ApplyOperationResult,
  applyOperations,
} from "../../executor/streamOperations/applyOperations.js";
import { promptManipulateDocumentUseMarkdownBlocks } from "../../prompts/markdownBlocksPrompt.js";
import {
  AsyncIterableStream,
  createAsyncIterableStreamFromAsyncIterable,
} from "../../util/stream.js";

import { duplicateInsertsToUpdates } from "../../executor/streamOperations/duplicateInsertsToUpdates.js";

import { updateToReplaceSteps } from "../../../prosemirror/changeset.js";
import {
  getApplySuggestionsTr,
  rebaseTool,
} from "../../../prosemirror/rebaseTool.js";

import {
  LLMRequestOptions,
  callLLMWithStreamTools,
} from "../../streamTool/callLLMWithStreamTools.js";
import { StreamToolCall } from "../../streamTool/streamTool.js";
import { AddBlocksToolCall } from "../../tools/createAddBlocksTool.js";
import { UpdateBlockToolCall } from "../../tools/createUpdateBlockTool.js";
import { DeleteBlockToolCall } from "../../tools/delete.js";
import { tools } from "./tools/index.js";

// Define the return type for streaming mode
type ReturnType = {
  toolCallsStream: AsyncIterableStream<ApplyOperationResult<any>>;
  llmResult: StreamObjectResult<any, any, any> | GenerateObjectResult<any>;
  apply: () => Promise<void>;
};

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

  const doc = await Promise.all(
    editor.document.map(async (block) => {
      return {
        id: block.id + "$",
        block: (await editor.blocksToMarkdownLossy([block]))
          .trim()
          .replace("&#x20;", " "),
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
    {
      block: { type: "string", description: "markdown of block" },
    }
  );

  const jsonToolCalls = toJSONToolCalls(editor, response.toolCallsStream);

  const operationsToApply = stream
    ? duplicateInsertsToUpdates(jsonToolCalls)
    : jsonToolCalls;

  const resultGenerator = applyOperations(
    editor,
    operationsToApply,
    async (id) => {
      const tr = getApplySuggestionsTr(editor);
      const md = await editor.blocksToMarkdownLossy([
        getBlock(editor, id, tr.doc)!,
      ]);
      const blocks = await editor.tryParseMarkdownToBlocks(md);

      const steps = updateToReplaceSteps(
        editor,
        {
          id,
          block: blocks[0],
          type: "update",
        },
        tr.doc
      );

      const stepMapping = new Mapping();
      for (const step of steps) {
        const mapped = step.map(stepMapping);
        if (!mapped) {
          throw new Error("Failed to map step");
        }
        tr.step(mapped);
        stepMapping.appendMap(mapped.getMap());
      }

      return rebaseTool(editor, tr);
    },
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

export async function* toJSONToolCalls(
  editor: BlockNoteEditor<any, any, any>,
  operationsSource: AsyncIterable<{
    operation: StreamToolCall<any>;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }>
): AsyncGenerator<{
  operation: StreamToolCall<any>;
  isUpdateToPreviousOperation: boolean;
  isPossiblyPartial: boolean;
}> {
  for await (const chunk of operationsSource) {
    const operation = chunk.operation;
    if (!isBuiltInToolCall(operation)) {
      yield chunk;
      continue;
    }

    if (operation.type === "add") {
      const blocks = await Promise.all(
        operation.blocks.map(async (md) => {
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
        } as AddBlocksToolCall<PartialBlock<any, any, any>>,
      };
    } else if (operation.type === "update") {
      // console.log("update", operation.block);
      const block = (
        await editor.tryParseMarkdownToBlocks(operation.block.trim())
      )[0];

      delete (block as any).id;
      // console.log("update", operation.block);
      // console.log("md", block);
      // hacky
      if ((window as any).__TEST_OPTIONS) {
        (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS.mockID = 0;
      }

      yield {
        ...chunk,
        operation: {
          ...operation,
          block,
        } as UpdateBlockToolCall<PartialBlock<any, any, any>>,
      };
    } else if (operation.type === "delete") {
      yield {
        ...chunk,
        operation: {
          ...operation,
        } as DeleteBlockToolCall,
      };
    } else {
      // @ts-expect-error Apparently TS gets lost here
      throw new UnreachableCaseError(operation);
    }
  }
}

function isBuiltInToolCall(
  operation: unknown
): operation is
  | UpdateBlockToolCall<string>
  | AddBlocksToolCall<string>
  | DeleteBlockToolCall {
  return (
    typeof operation === "object" &&
    operation !== null &&
    "type" in operation &&
    (operation.type === "update" ||
      operation.type === "add" ||
      operation.type === "delete")
  );
}
