import { BlockNoteEditor } from "@blocknote/core";
import { LanguageModel, generateObject, streamObject } from "ai";
import { AIFunction } from "../../functions/index.js";
import type { PromptOrMessages } from "../../index.js";
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
type CallLLMOptions = BasicLLMRequestOptions & (StreamLLMRequestOptions | NoStreamLLMRequestOptions);
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type CallLLMOptionsWithOptional = Optional<CallLLMOptions, "functions" | "stream">;
export declare function callLLM(editor: BlockNoteEditor<any, any, any>, opts: CallLLMOptionsWithOptional): Promise<import("ai").StreamObjectResult<{
    operations?: any[] | undefined;
}, {
    operations: any[];
}, never> | import("ai").GenerateObjectResult<{
    operations: any[];
}>>;
export {};
