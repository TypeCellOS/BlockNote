import { Plugin } from "prosemirror-state";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
export declare class PlaceholderPlugin {
    readonly plugin: Plugin;
    constructor(editor: BlockNoteEditor<any, any, any>, placeholders: Record<string | "default", string>);
}
