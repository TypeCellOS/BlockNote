import { Block } from "../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { BlockIdentifier, BlockSchema, InlineContentSchema, StyleSchema } from "../../../schema/index.js";
export declare function getBlock<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>, blockIdentifier: BlockIdentifier): Block<BSchema, I, S> | undefined;
export declare function getPrevBlock<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>, blockIdentifier: BlockIdentifier): Block<BSchema, I, S> | undefined;
export declare function getNextBlock<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>, blockIdentifier: BlockIdentifier): Block<BSchema, I, S> | undefined;
export declare function getParentBlock<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>, blockIdentifier: BlockIdentifier): Block<BSchema, I, S> | undefined;
