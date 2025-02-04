import { BlockNoteEditor } from "@blocknote/core";
declare function applyOperation(operation: any, editor: BlockNoteEditor, _operationContext: any, options: {
    idsSuffixed: boolean;
}): void;
declare function validateOperation(operation: any, editor: BlockNoteEditor, options: {
    idsSuffixed: boolean;
}): boolean;
export declare const updateFunction: {
    schema: {
        name: string;
        description: string;
        parameters: {
            id: {
                type: string;
                description: string;
            };
            block: {
                $ref: string;
            };
        };
        required: string[];
    };
    apply: typeof applyOperation;
    validate: typeof validateOperation;
};
export {};
