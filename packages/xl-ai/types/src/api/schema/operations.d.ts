import { AIFunction } from "../functions/index.js";
import { SimpleJSONObjectSchema } from "../util/JSONSchema.js";
export declare function functionToOperationJSONSchema(func: AIFunction): {
    readonly type: "object";
    readonly description: string;
    readonly properties: {
        readonly referenceId: {
            readonly type: "string";
            readonly description: "";
        };
        readonly position: {
            readonly type: "string";
            readonly enum: readonly ["before", "after"];
            readonly description: "Whether new block(s) should be inserterd before or after `referenceId`";
        };
        readonly blocks: {
            readonly items: {
                readonly $ref: "#/$defs/block";
            };
            readonly type: "array";
        };
        readonly type: {
            readonly type: "string";
            readonly enum: readonly [string];
        };
    } | {
        readonly id: {
            type: string;
            description: string;
        };
        readonly type: {
            readonly type: "string";
            readonly enum: readonly [string];
        };
    } | {
        readonly id: {
            type: string;
            description: string;
        };
        readonly block: {
            $ref: string;
        };
        readonly type: {
            readonly type: "string";
            readonly enum: readonly [string];
        };
    };
    readonly required: readonly ["type", "referenceId", "position", "blocks"] | readonly ["type", ...string[]];
    readonly additionalProperties: false;
};
export declare function createOperationsArraySchema(functions: AIFunction[]): SimpleJSONObjectSchema;
