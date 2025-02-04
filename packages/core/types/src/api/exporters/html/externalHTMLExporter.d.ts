import { Schema } from "prosemirror-model";
import { PartialBlock } from "../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { InlineContent, InlineContentSchema, StyleSchema } from "../../../schema/index.js";
export declare const createExternalHTMLExporter: <BSchema extends Record<string, import("../../../schema/index.js").BlockConfig>, I extends InlineContentSchema, S extends StyleSchema>(schema: Schema, editor: BlockNoteEditor<BSchema, I, S>) => {
    exportBlocks: (blocks: PartialBlock<BSchema, I, S>[], options: {
        document?: Document;
    }) => string;
    exportInlineContent: (inlineContent: InlineContent<I, S>[], options: {
        document?: Document;
    }) => string;
};
