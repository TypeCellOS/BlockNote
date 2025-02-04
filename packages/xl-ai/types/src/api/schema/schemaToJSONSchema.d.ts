import { BlockNoteSchema, BlockSchema, InlineContentSchema, PropSchema, StyleSchema } from "@blocknote/core";
import { SimpleJSONObjectSchema } from "../util/JSONSchema.js";
export declare function styleSchemaToJSONSchema(schema: StyleSchema): SimpleJSONObjectSchema;
export declare function styledTextToJSONSchema(): {
    type: string;
    properties: {
        type: {
            type: string;
            enum: string[];
        };
        text: {
            type: string;
        };
        styles: {
            $ref: string;
        };
    };
    additionalProperties: boolean;
    required: string[];
};
export declare function propSchemaToJSONSchema(propSchema: PropSchema): SimpleJSONObjectSchema;
export declare function inlineContentSchemaToJSONSchema(schema: InlineContentSchema): {
    type: string;
    items: {
        anyOf: ({
            $ref: string;
            type?: undefined;
            properties?: undefined;
            additionalProperties?: undefined;
            required?: undefined;
        } | {
            type: string;
            properties: {
                type: {
                    type: string;
                    enum: string[];
                };
                content: {
                    type: string;
                    items: {
                        $ref: string;
                    };
                };
                href: {
                    type: string;
                };
                props?: undefined;
            };
            additionalProperties: boolean;
            required: string[];
            $ref?: undefined;
        } | {
            type: string;
            properties: {
                type: {
                    type: string;
                    enum: string[];
                };
                content: {
                    type: string;
                    items: {
                        $ref: string;
                    };
                } | undefined;
                props: {
                    type: string;
                    properties: SimpleJSONObjectSchema;
                    additionalProperties: boolean;
                };
                href?: undefined;
            };
            additionalProperties: boolean;
            required: string[];
            $ref?: undefined;
        })[];
    };
};
export declare function blockSchemaToJSONSchema(schema: BlockSchema): {
    anyOf: SimpleJSONObjectSchema[];
};
export declare function blockNoteSchemaToJSONSchema(schema: Pick<BlockNoteSchema<BlockSchema, InlineContentSchema, StyleSchema>, "blockSchema" | "inlineContentSchema" | "styleSchema">): {
    $defs: {
        styles: SimpleJSONObjectSchema;
        styledtext: {
            type: string;
            properties: {
                type: {
                    type: string;
                    enum: string[];
                };
                text: {
                    type: string;
                };
                styles: {
                    $ref: string;
                };
            };
            additionalProperties: boolean;
            required: string[];
        };
        inlinecontent: {
            type: string;
            items: {
                anyOf: ({
                    $ref: string;
                    type?: undefined;
                    properties?: undefined;
                    additionalProperties?: undefined;
                    required?: undefined;
                } | {
                    type: string;
                    properties: {
                        type: {
                            type: string;
                            enum: string[];
                        };
                        content: {
                            type: string;
                            items: {
                                $ref: string;
                            };
                        };
                        href: {
                            type: string;
                        };
                        props?: undefined;
                    };
                    additionalProperties: boolean;
                    required: string[];
                    $ref?: undefined;
                } | {
                    type: string;
                    properties: {
                        type: {
                            type: string;
                            enum: string[];
                        };
                        content: {
                            type: string;
                            items: {
                                $ref: string;
                            };
                        } | undefined;
                        props: {
                            type: string;
                            properties: SimpleJSONObjectSchema;
                            additionalProperties: boolean;
                        };
                        href?: undefined;
                    };
                    additionalProperties: boolean;
                    required: string[];
                    $ref?: undefined;
                })[];
            };
        };
        block: {
            anyOf: SimpleJSONObjectSchema[];
        };
    };
};
type Writeable<T> = {
    -readonly [P in keyof T]: T[P];
};
export declare function schemaOps(schema: Pick<BlockNoteSchema<BlockSchema, InlineContentSchema, StyleSchema>, "blockSchema" | "inlineContentSchema" | "styleSchema">): {
    removeFileBlocks(): any;
    removeDefaultProps(): any;
    get(): Writeable<Pick<BlockNoteSchema<Record<string, import("@blocknote/core").BlockConfig>, InlineContentSchema, StyleSchema>, "blockSchema" | "inlineContentSchema" | "styleSchema">>;
};
export {};
