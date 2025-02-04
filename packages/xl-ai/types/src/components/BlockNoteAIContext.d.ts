import { Block } from "@blocknote/core";
import { LanguageModel } from "ai";
import { useState } from "react";
import { PromptOrMessages, llm } from "../api/index.js";
type GlobalLLMCallOptions = {
    model: LanguageModel;
} & ({
    dataFormat?: "json";
    stream?: boolean;
} | {
    dataFormat?: "markdown";
    stream?: false;
});
type CallSpecificCallLLMOptions = Omit<Parameters<typeof llm.json.call>[1] & Parameters<typeof llm.markdown.call>[1], "model" | "stream" | "prompt" | "messages"> & PromptOrMessages;
export type BlockNoteAIContextValue = {
    callLLM: (options: CallSpecificCallLLMOptions) => Promise<any>;
    aiMenuBlockID: ReturnType<typeof useState<string | undefined>>[0];
    setAiMenuBlockID: ReturnType<typeof useState<string | undefined>>[1];
    aiResponseStatus: "initial" | "generating" | "done";
    setAIResponseStatus: (aiResponseStatus: "initial" | "generating" | "done") => void;
    prevDocument: ReturnType<typeof useState<Block<any, any, any>[] | undefined>>[0];
    setPrevDocument: ReturnType<typeof useState<Block<any, any, any>[] | undefined>>[1];
} & GlobalLLMCallOptions;
export declare const BlockNoteAIContext: import("react").Context<BlockNoteAIContextValue | undefined>;
export declare function useBlockNoteAIContext(): BlockNoteAIContextValue;
export declare function BlockNoteAIContextProvider(props: {
    children: React.ReactNode;
} & GlobalLLMCallOptions): import("react/jsx-runtime").JSX.Element;
export {};
