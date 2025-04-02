import {
  Block,
  BlockNoteEditor,
  PartialBlock,
  UnreachableCaseError,
  getBlock,
} from "@blocknote/core";
import { CoreMessage, GenerateObjectResult, StreamObjectResult } from "ai";
import type { PromptOrMessages } from "../../index.js";

import {
  ApplyOperationResult,
  applyOperations,
} from "../../executor/streamOperations/applyOperations.js";

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
  promptManipulateDocumentUseHTMLBlocks,
  promptManipulateSelectionHTMLBlocks,
} from "../../prompts/htmlBlocksPrompt.js";
import {
  LLMRequestOptions,
  callLLMWithStreamTools,
} from "../../streamTool/callLLMWithStreamTools.js";
import { StreamToolCall } from "../../streamTool/streamTool.js";
import { AddBlocksToolCall } from "../../tools/createAddBlocksTool.js";
import { UpdateBlockToolCall } from "../../tools/createUpdateBlockTool.js";
import { DeleteBlockToolCall } from "../../tools/delete.js";
import { trimArray } from "../../util/trimArray.js";
import { tools } from "./tools/index.js";

// Define the return type for streaming mode
type ReturnType = {
  toolCallsStream: AsyncIterableStream<ApplyOperationResult<any>>;
  llmResult: StreamObjectResult<any, any, any> | GenerateObjectResult<any>;
  apply: () => Promise<void>;
};

function isEmptyParagraph(block: PartialBlock<any, any, any>) {
  return (
    block.type === "paragraph" &&
    Array.isArray(block.content) &&
    block.content.length === 0
  );
}

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
    },
  onStart?: () => void
): Promise<ReturnType> {
  const mergedStreamTools = {
    add: true,
    update: true,
    delete: true,
    ...opts.defaultStreamTools,
  };

  const { prompt, useSelection, stream = true, ...rest } = opts;

  let messages: CoreMessage[];

  let beforeCursorBlockId: string | undefined;
  let deleteCursorBlock: string | undefined;
  let source: Block<any, any, any>[];

  const selectionInfo = useSelection ? editor.getSelection2() : undefined;

  if (!useSelection) {
    const textCursorPosition = editor.getTextCursorPosition();
    if (isEmptyParagraph(textCursorPosition.block)) {
      beforeCursorBlockId = textCursorPosition.prevBlock!.id; // TODO: handle cursor at start of document
      source = editor.document.filter(
        (block) => block.id !== textCursorPosition.block.id
      );
      deleteCursorBlock = textCursorPosition.block.id;
    } else {
      beforeCursorBlockId = textCursorPosition.block.id;
      source = editor.document;
    }
  } else {
    source = selectionInfo!.blocks;
  }

  // trim empty trailing blocks that don't have the cursor
  // if we don't do this, commands like "add some paragraphs"
  // would add paragraphs after the trailing blocks
  const trimmedSource = trimArray(
    source,
    (block) => {
      return isEmptyParagraph(block) && block.id !== beforeCursorBlockId;
    },
    false
  );

  // TODO: child blocks
  const doc = (
    await Promise.all(
      trimmedSource.map(async (block) => {
        const ret: Array<
          | {
              id: string;
              block: string;
            }
          | {
              cursor: true;
            }
        > = [];
        ret.push({
          id: block.id + "$",
          block: await editor.blocksToHTMLLossy([block]),
        });
        if (block.id === beforeCursorBlockId) {
          ret.push({
            cursor: true,
          });
        }
        return ret;
      })
    )
  ).flat();

  const entireDoc = (
    await Promise.all(
      editor.document.map(async (block) => {
        const ret: Array<{
          block: string;
        }> = [];
        ret.push({
          block: await editor.blocksToHTMLLossy([block]),
        });

        return ret;
      })
    )
  ).flat();

  if ("messages" in opts && opts.messages) {
    messages = opts.messages;
  } else if (useSelection) {
    messages = promptManipulateSelectionHTMLBlocks({
      userPrompt: opts.prompt,
      html: doc as any, // TODO
      document: entireDoc,
    });
  } else {
    messages = promptManipulateDocumentUseHTMLBlocks({
      userPrompt: opts.prompt,
      html: doc,
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
      block: { type: "string", description: "html of block" },
    },
    onStart
  );

  async function* deleteCursorBlockWhenStreamStarts<T>(
    operations: AsyncIterable<T>
  ): AsyncIterable<T> {
    let deleted = false;
    for await (const chunk of operations) {
      if (!deleted && deleteCursorBlock) {
        editor.removeBlocks([deleteCursorBlock]);
        deleted = true;
      }
      yield chunk;
    }
  }

  const jsonToolCalls = toJSONToolCalls(
    editor,
    deleteCursorBlockWhenStreamStarts(response.toolCallsStream)
  );

  const operationsToApply = stream
    ? duplicateInsertsToUpdates(jsonToolCalls)
    : jsonToolCalls;

  const resultGenerator = applyOperations(
    editor,
    operationsToApply,
    async (id) => {
      const tr = getApplySuggestionsTr(editor);
      const html = await editor.blocksToHTMLLossy([
        getBlock(editor, id, tr.doc)!,
      ]);
      const blocks = await editor.tryParseHTMLToBlocks(html);
      if (blocks.length !== 1) {
        throw new Error("html diff invalid block count");
      }
      const htmlBlock = blocks[0];
      htmlBlock.id = id;
      // console.log(html);
      // console.log(JSON.stringify(blocks, null, 2));
      const steps = updateToReplaceSteps(
        editor,
        {
          id,
          block: htmlBlock,
          type: "update",
        },
        tr.doc
      );

      if (steps.length) {
        console.error("html diff", steps);
        // throw new Error("html diff");
      }
      // const stepMapping = new Mapping();
      // for (const step of steps) {
      //   const mapped = step.map(stepMapping);
      //   if (!mapped) {
      //     throw new Error("Failed to map step");
      //   }
      //   tr.step(mapped);
      //   stepMapping.appendMap(mapped.getMap());
      // }

      return rebaseTool(editor, tr);
    },
    {
      withDelays: true, // TODO: make configurable
    },
    selectionInfo?._meta.startPos,
    selectionInfo?._meta.endPos
  );

  // TODO: copy this pattern
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
      const blocks = (
        await Promise.all(
          operation.blocks.map(async (html) => {
            const parsedHtml = chunk.isPossiblyPartial
              ? getPartialHTML(html)
              : html;
            if (!parsedHtml) {
              return [];
            }
            return (await editor.tryParseHTMLToBlocks(parsedHtml)).map(
              (block) => {
                delete (block as any).id;
                return block;
              }
            );
          })
        )
      ).flat();

      if (blocks.length === 0) {
        continue;
      }

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
      const html = chunk.isPossiblyPartial
        ? getPartialHTML(operation.block)
        : operation.block;

      if (!html) {
        continue;
      }

      const block = (await editor.tryParseHTMLToBlocks(html))[0];

      // console.log("update", operation.block);
      // console.log("html", html);
      // hacky
      if ((window as any).__TEST_OPTIONS) {
        (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS.mockID = 0;
      }

      delete (block as any).id;

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
      return;
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

/**
 * Completes partial HTML by parsing and correcting incomplete tags.
 * Examples:
 * <p>hello -> <p>hello</p>
 * <p>hello <sp -> <p>hello </p>
 * <p>hello <span -> <p>hello </p>
 * <p>hello <span> -> <p>hello <span></span></p>
 * <p>hello <span>world -> <p>hello <span>world</span></p>
 * <p>hello <span>world</span> -> <p>hello <span>world</span></p>
 *
 * @param html A potentially incomplete HTML string
 * @returns A properly formed HTML string with all tags closed
 */
function getPartialHTML(html: string): string | undefined {
  // Simple check: if the last '<' doesn't have a matching '>',
  // then we have an incomplete tag at the end
  const lastOpenBracket = html.lastIndexOf("<");
  const lastCloseBracket = html.lastIndexOf(">");

  // Handle incomplete tags by removing everything after the last complete tag
  let htmlToProcess = html;
  if (lastOpenBracket > lastCloseBracket) {
    htmlToProcess = html.substring(0, lastOpenBracket);
    // If nothing remains after removing the incomplete tag, return empty string
    if (!htmlToProcess.trim()) {
      return undefined;
    }
  }

  // TODO: clean script tags?
  // Parse the HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<div>${htmlToProcess}</div>`,
    "text/html"
  );
  const el = doc.body.firstChild as HTMLElement;
  return el ? el.innerHTML : "";
}
