import {
    BlockNoteEditor,
    PartialBlock,
    UnreachableCaseError
} from "@blocknote/core";
  
import { StreamToolCall } from "../../../streamTool/streamTool.js";
import { AddBlocksToolCall } from "../../../tools/createAddBlocksTool.js";
import { UpdateBlockToolCall } from "../../../tools/createUpdateBlockTool.js";
import { DeleteBlockToolCall } from "../../../tools/delete.js";

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
  
  
  // streamOperations
  
  // generateOperations
  
  
  // Tools:
  // - update, add, delete
  // - documentOperations tool (update, add, delete)
  
  // - toolCallStreaming