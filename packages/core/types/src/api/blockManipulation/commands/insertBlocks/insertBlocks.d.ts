import { Block, PartialBlock } from "../../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor";
import { BlockIdentifier, BlockSchema, InlineContentSchema, StyleSchema } from "../../../../schema/index.js";
export declare function insertBlocks<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>, blocksToInsert: PartialBlock<BSchema, I, S>[], referenceBlock: BlockIdentifier, placement?: "before" | "after"): Block<BSchema, I, S>[];
