import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor";
import { Selection } from "../../../editor/selectionTypes.js";
import { BlockIdentifier, BlockSchema, InlineContentSchema, StyleSchema } from "../../../schema/index.js";
export declare function getSelection<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>): Selection<BSchema, I, S> | undefined;
export declare function setSelection<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>, startBlock: BlockIdentifier, endBlock: BlockIdentifier): void;
