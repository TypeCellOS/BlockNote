import { BlockNoteEditor } from "@blocknote/core";
declare function applyOperation(operation: any, editor: BlockNoteEditor, operationContext: any, options: {
    idsSuffixed: boolean;
}): string[] | {
    operationContext: any;
    lastAffectedBlockId: any;
};
declare function validateOperation(operation: any, editor: BlockNoteEditor, options: {
    idsSuffixed: boolean;
}): boolean;
export declare const addFunction: {
    schema: {
        readonly name: "add";
        readonly description: "Insert new blocks";
        readonly parameters: {
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
        };
        readonly required: readonly ["referenceId", "position", "blocks"];
    };
    apply: typeof applyOperation;
    validate: typeof validateOperation;
};
export {};
