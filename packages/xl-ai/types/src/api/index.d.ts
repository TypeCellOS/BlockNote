import { CoreMessage } from "ai";
import { callLLM as callLLMJSON } from "./formats/json/json.js";
import { callLLM as callLLMMarkdown } from "./formats/markdown/markdown.js";
export declare const llm: {
    json: {
        call: typeof callLLMJSON;
    };
    markdown: {
        call: typeof callLLMMarkdown;
    };
};
export type PromptOrMessages = {
    useSelection?: boolean;
    prompt: string;
    messages?: never;
} | {
    useSelection?: never;
    prompt?: never;
    messages: Array<CoreMessage>;
};
