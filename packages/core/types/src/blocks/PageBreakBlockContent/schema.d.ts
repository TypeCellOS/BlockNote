import { BlockNoteSchema } from "../../editor/BlockNoteSchema.js";
import { InlineContentSchema, StyleSchema } from "../../schema/index.js";
import { PageBreak } from "./PageBreakBlockContent.js";
export declare const pageBreakSchema: BlockNoteSchema<import("../../schema/index.js").BlockSchemaFromSpecs<{
    pageBreak: {
        config: {
            type: "pageBreak";
            propSchema: {};
            content: "none";
            isFileBlock: false;
            isSelectable: false;
        };
        implementation: import("../../schema/index.js").TiptapBlockImplementation<{
            type: "pageBreak";
            propSchema: {};
            content: "none";
            isFileBlock: false;
            isSelectable: false;
        }, any, InlineContentSchema, StyleSchema>;
    };
}>, import("../../schema/index.js").InlineContentSchemaFromSpecs<{
    text: {
        config: "text";
        implementation: any;
    };
    link: {
        config: "link";
        implementation: any;
    };
}>, import("../../schema/index.js").StyleSchemaFromSpecs<{
    bold: {
        config: {
            type: string;
            propSchema: "boolean";
        };
        implementation: import("../../schema/index.js").StyleImplementation;
    };
    italic: {
        config: {
            type: string;
            propSchema: "boolean";
        };
        implementation: import("../../schema/index.js").StyleImplementation;
    };
    underline: {
        config: {
            type: string;
            propSchema: "boolean";
        };
        implementation: import("../../schema/index.js").StyleImplementation;
    };
    strike: {
        config: {
            type: string;
            propSchema: "boolean";
        };
        implementation: import("../../schema/index.js").StyleImplementation;
    };
    code: {
        config: {
            type: string;
            propSchema: "boolean";
        };
        implementation: import("../../schema/index.js").StyleImplementation;
    };
    textColor: {
        config: {
            type: string;
            propSchema: "string";
        };
        implementation: import("../../schema/index.js").StyleImplementation;
    };
    backgroundColor: {
        config: {
            type: string;
            propSchema: "string";
        };
        implementation: import("../../schema/index.js").StyleImplementation;
    };
}>>;
/**
 * Adds page break support to the given schema.
 */
export declare const withPageBreak: <B extends Record<string, import("../../schema/index.js").BlockConfig>, I extends InlineContentSchema, S extends StyleSchema>(schema: BlockNoteSchema<B, I, S>) => BlockNoteSchema<B & {
    pageBreak: typeof PageBreak.config;
}, I, S>;
