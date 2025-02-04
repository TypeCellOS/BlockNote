import { Node } from "prosemirror-model";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema/index.js";
export declare function insertContentAt<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(position: any, nodes: Node[], editor: BlockNoteEditor<BSchema, I, S>, options?: {
    updateSelection: boolean;
}): boolean;
