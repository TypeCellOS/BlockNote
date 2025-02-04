import { Block } from "../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { UiElementPosition } from "../../extensions-shared/UiElementPosition.js";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema/index.js";
export type SideMenuState<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema> = UiElementPosition & {
    block: Block<BSchema, I, S>;
};
export declare function unsetDragImage(rootEl: Document | ShadowRoot): void;
export declare function dragStart<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(e: {
    dataTransfer: DataTransfer | null;
    clientY: number;
}, block: Block<BSchema, I, S>, editor: BlockNoteEditor<BSchema, I, S>): void;
