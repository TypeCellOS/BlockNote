import { BlockNoteEditor } from "@blocknote/core";
import { LanguageModel, generateText } from "ai";
import type { PromptOrMessages } from "../../index.js";
type BasicLLMRequestOptions = {
    model: LanguageModel;
} & PromptOrMessages;
type MarkdownLLMRequestOptions = BasicLLMRequestOptions & {
    _generateTextOptions?: Partial<Parameters<typeof generateText<any>>[0]>;
};
export declare function callLLM(editor: BlockNoteEditor<any, any, any>, options: MarkdownLLMRequestOptions): Promise<void>;
export {};
