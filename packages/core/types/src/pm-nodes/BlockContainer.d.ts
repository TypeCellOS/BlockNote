import { Node } from "@tiptap/core";
import type { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
/**
 * The main "Block node" documents consist of
 */
export declare const BlockContainer: Node<{
    domAttributes?: Partial<{
        blockContent: Record<string, string>;
        blockGroup: Record<string, string>;
        editor: Record<string, string>;
        block: Record<string, string>;
        inlineContent: Record<string, string>;
    }> | undefined;
    editor: BlockNoteEditor<any, any, any>;
}, any>;
