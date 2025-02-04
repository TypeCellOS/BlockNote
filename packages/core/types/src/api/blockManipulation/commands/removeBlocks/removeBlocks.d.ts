import { Block } from "../../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor";
import { BlockIdentifier, BlockSchema, InlineContentSchema, StyleSchema } from "../../../../schema/index.js";
export declare function removeBlocks<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>, blocksToRemove: BlockIdentifier[]): Block<BSchema, I, S>[];
