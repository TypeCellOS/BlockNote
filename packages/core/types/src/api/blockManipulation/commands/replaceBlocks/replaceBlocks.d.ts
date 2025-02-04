import { Block, PartialBlock } from "../../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor";
import { BlockIdentifier, BlockSchema, InlineContentSchema, StyleSchema } from "../../../../schema/index.js";
export declare function removeAndInsertBlocks<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>, blocksToRemove: BlockIdentifier[], blocksToInsert: PartialBlock<BSchema, I, S>[]): {
    insertedBlocks: Block<BSchema, I, S>[];
    removedBlocks: Block<BSchema, I, S>[];
};
export declare function replaceBlocks<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>, blocksToRemove: BlockIdentifier[], blocksToInsert: PartialBlock<BSchema, I, S>[]): {
    insertedBlocks: Block<BSchema, I, S>[];
    removedBlocks: Block<BSchema, I, S>[];
};
