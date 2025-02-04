import { Schema } from "prosemirror-model";
import { PartialBlock } from "../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../../schema/index.js";
export declare function cleanHTMLToMarkdown(cleanHTMLString: string): string;
export declare function blocksToMarkdown<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(blocks: PartialBlock<BSchema, I, S>[], schema: Schema, editor: BlockNoteEditor<BSchema, I, S>, options: {
    document?: Document;
}): Promise<string>;
