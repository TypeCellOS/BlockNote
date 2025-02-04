import { BlockNoteEditor } from "@blocknote/core";
import { CoreMessage } from "ai";
export declare function promptManipulateSelectionJSONSchema(opts: {
    editor: BlockNoteEditor;
    userPrompt: string;
    document: any;
}): Array<CoreMessage>;
export declare function promptManipulateDocumentUseJSONSchema(opts: {
    editor: BlockNoteEditor;
    userPrompt: string;
    document: any;
}): Array<CoreMessage>;
