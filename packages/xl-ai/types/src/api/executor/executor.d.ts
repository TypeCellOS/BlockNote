import { BlockNoteEditor } from "@blocknote/core";
import { AIFunction } from "../functions/index.js";
export declare function executeAIOperation(operation: any, editor: BlockNoteEditor, functions: AIFunction[], operationContext: any, options?: {
    idsSuffixed: boolean;
}): any;
type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;
export declare function executeAIOperationStream(editor: BlockNoteEditor, operationsStream: AsyncIterableStream<{
    operations?: any[];
}>, functions: AIFunction[]): Promise<void>;
export {};
