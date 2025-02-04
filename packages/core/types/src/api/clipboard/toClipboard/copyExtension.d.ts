import { Extension } from "@tiptap/core";
import { EditorView } from "prosemirror-view";
import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../../schema/index.js";
export declare function selectedFragmentToHTML<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(view: EditorView, editor: BlockNoteEditor<BSchema, I, S>): {
    clipboardHTML: string;
    externalHTML: string;
    markdown: string;
};
export declare const createCopyToClipboardExtension: <BSchema extends Record<string, import("../../../schema/index.js").BlockConfig>, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>) => Extension<{
    editor: BlockNoteEditor<BSchema, I, S>;
}, undefined>;
