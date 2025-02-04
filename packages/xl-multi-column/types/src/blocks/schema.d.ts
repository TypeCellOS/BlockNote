import { BlockNoteSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { ColumnBlock, ColumnListBlock } from "./Columns/index.js";
export declare const multiColumnSchema: BlockNoteSchema<import("@blocknote/core").BlockSchemaFromSpecs<{
    column: {
        config: {
            type: "column";
            content: "none";
            propSchema: {
                width: {
                    default: number;
                };
            };
        };
        implementation: import("@blocknote/core").TiptapBlockImplementation<{
            type: "column";
            content: "none";
            propSchema: {
                width: {
                    default: number;
                };
            };
        }, any, InlineContentSchema, StyleSchema>;
    };
    columnList: {
        config: {
            type: "columnList";
            content: "none";
            propSchema: {};
        };
        implementation: import("@blocknote/core").TiptapBlockImplementation<{
            type: "columnList";
            content: "none";
            propSchema: {};
        }, any, InlineContentSchema, StyleSchema>;
    };
}>, import("@blocknote/core").InlineContentSchemaFromSpecs<{
    text: {
        config: "text";
        implementation: any;
    };
    link: {
        config: "link";
        implementation: any;
    };
}>, import("@blocknote/core").StyleSchemaFromSpecs<{
    bold: {
        config: {
            type: string;
            propSchema: "boolean";
        };
        implementation: import("@blocknote/core").StyleImplementation;
    };
    italic: {
        config: {
            type: string;
            propSchema: "boolean";
        };
        implementation: import("@blocknote/core").StyleImplementation;
    };
    underline: {
        config: {
            type: string;
            propSchema: "boolean";
        };
        implementation: import("@blocknote/core").StyleImplementation;
    };
    strike: {
        config: {
            type: string;
            propSchema: "boolean";
        };
        implementation: import("@blocknote/core").StyleImplementation;
    };
    code: {
        config: {
            type: string;
            propSchema: "boolean";
        };
        implementation: import("@blocknote/core").StyleImplementation;
    };
    textColor: {
        config: {
            type: string;
            propSchema: "string";
        };
        implementation: import("@blocknote/core").StyleImplementation;
    };
    backgroundColor: {
        config: {
            type: string;
            propSchema: "string";
        };
        implementation: import("@blocknote/core").StyleImplementation;
    };
}>>;
/**
 * Adds multi-column support to the given schema.
 */
export declare const withMultiColumn: <B extends Record<string, import("@blocknote/core").BlockConfig>, I extends InlineContentSchema, S extends StyleSchema>(schema: BlockNoteSchema<B, I, S>) => BlockNoteSchema<B & {
    column: typeof ColumnBlock.config;
    columnList: typeof ColumnListBlock.config;
}, I, S>;
