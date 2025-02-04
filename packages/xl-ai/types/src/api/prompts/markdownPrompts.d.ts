import { BlockNoteEditor } from "@blocknote/core";
import { CoreMessage } from "ai";
export declare function promptManipulateDocumentUseMarkdown(opts: {
    editor: BlockNoteEditor;
    userPrompt: string;
    markdown: string;
}): Array<CoreMessage>;
