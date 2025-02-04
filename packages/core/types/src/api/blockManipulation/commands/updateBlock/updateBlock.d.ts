import { EditorState } from "prosemirror-state";
import { Block, PartialBlock } from "../../../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { BlockIdentifier, BlockSchema } from "../../../../schema/blocks/types.js";
import { InlineContentSchema } from "../../../../schema/inlineContent/types.js";
import { StyleSchema } from "../../../../schema/styles/types.js";
export declare const updateBlockCommand: <BSchema extends Record<string, import("../../../../schema/blocks/types.js").BlockConfig>, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>, posBeforeBlock: number, block: PartialBlock<BSchema, I, S>) => ({ state, dispatch, }: {
    state: EditorState;
    dispatch: ((args?: any) => any) | undefined;
}) => boolean;
export declare function updateBlock<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>, blockToUpdate: BlockIdentifier, update: PartialBlock<BSchema, I, S>): Block<BSchema, I, S>;
