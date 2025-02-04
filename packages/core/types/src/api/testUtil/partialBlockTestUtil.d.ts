import { Block, PartialBlock } from "../../blocks/defaultBlocks.js";
import { BlockNoteSchema } from "../../editor/BlockNoteSchema.js";
import { BlockSchema } from "../../schema/blocks/types.js";
import { InlineContentSchema } from "../../schema/inlineContent/types.js";
import { StyleSchema } from "../../schema/styles/types.js";
export declare function partialBlocksToBlocksForTesting<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(schema: BlockNoteSchema<BSchema, I, S>, partialBlocks: Array<PartialBlock<NoInfer<BSchema>, NoInfer<I>, NoInfer<S>>>): Array<Block<BSchema, I, S>>;
export declare function partialBlockToBlockForTesting<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(schema: BSchema, partialBlock: PartialBlock<BSchema, I, S>): Block<BSchema, I, S>;
export declare function addIdsToBlock(block: PartialBlock<any, any, any>): void;
export declare function addIdsToBlocks(blocks: PartialBlock<any, any, any>[]): void;
