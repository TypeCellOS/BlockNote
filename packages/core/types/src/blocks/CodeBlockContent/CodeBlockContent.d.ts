import { SupportedLanguageConfig } from "./defaultSupportedLanguages.js";
interface CodeBlockOptions {
    defaultLanguage: string;
    indentLineWithTab: boolean;
    supportedLanguages: SupportedLanguageConfig[];
}
export declare const shikiParserSymbol: unique symbol;
export declare const shikiHighlighterPromiseSymbol: unique symbol;
export declare const defaultCodeBlockPropSchema: {
    language: {
        default: string;
        values: string[];
    };
};
export declare const CodeBlock: {
    config: {
        type: "codeBlock";
        content: "inline";
        propSchema: {
            language: {
                default: string;
                values: string[];
            };
        };
    };
    implementation: import("../../schema/index.js").TiptapBlockImplementation<{
        type: "codeBlock";
        content: "inline";
        propSchema: {
            language: {
                default: string;
                values: string[];
            };
        };
    }, any, import("../../schema/index.js").InlineContentSchema, import("../../schema/index.js").StyleSchema>;
};
export declare function customizeCodeBlock(options: Partial<CodeBlockOptions>): {
    config: {
        type: string;
        content: "none";
        propSchema: {
            language: {
                default: string;
                values: string[];
            };
        };
    };
    implementation: import("../../schema/index.js").TiptapBlockImplementation<{
        type: string;
        content: "none";
        propSchema: {
            language: {
                default: string;
                values: string[];
            };
        };
    }, any, import("../../schema/index.js").InlineContentSchema, import("../../schema/index.js").StyleSchema>;
};
export {};
