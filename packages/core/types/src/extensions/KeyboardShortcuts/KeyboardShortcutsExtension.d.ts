import { Extension } from "@tiptap/core";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
export declare const KeyboardShortcutsExtension: Extension<{
    editor: BlockNoteEditor<any, any, any>;
    tabBehavior: "prefer-navigate-ui" | "prefer-indent";
}, any>;
