import { DOMSerializer } from "prosemirror-model";
import { PartialBlock } from "../../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../../../schema/index.js";
export declare function serializeInlineContentInternalHTML<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<any, I, S>, blockContent: PartialBlock<BSchema, I, S>["content"], serializer: DOMSerializer, options?: {
    document?: Document;
}): HTMLElement | DocumentFragment;
export declare const serializeBlocksInternalHTML: <BSchema extends Record<string, import("../../../../schema/index.js").BlockConfig>, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>, blocks: PartialBlock<BSchema, I, S>[], serializer: DOMSerializer, options?: {
    document?: Document;
}) => HTMLElement;
