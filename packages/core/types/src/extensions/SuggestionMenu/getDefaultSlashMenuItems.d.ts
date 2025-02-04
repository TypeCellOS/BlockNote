import { Block, PartialBlock } from "../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema/index.js";
import { DefaultSuggestionItem } from "./DefaultSuggestionItem.js";
export declare function insertOrUpdateBlock<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>, block: PartialBlock<BSchema, I, S>): Block<BSchema, I, S>;
export declare function getDefaultSlashMenuItems<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>): DefaultSuggestionItem[];
export declare function filterSuggestionItems<T extends {
    title: string;
    aliases?: readonly string[];
}>(items: T[], query: string): T[];
