import type { BlockNoteEditor } from "@blocknote/core";
import { Plugin } from "prosemirror-state";
interface DropCursorOptions {
    color?: string | false;
    width?: number;
    class?: string;
}
export declare function multiColumnDropCursor(options: DropCursorOptions & {
    editor: BlockNoteEditor<any, any, any>;
}): Plugin;
export {};
