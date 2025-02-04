import { EditorState, Plugin, PluginKey, PluginView } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";
import { Block } from "../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { UiElementPosition } from "../../extensions-shared/UiElementPosition.js";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema/index.js";
import { EventEmitter } from "../../util/EventEmitter.js";
export type SideMenuState<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema> = UiElementPosition & {
    block: Block<BSchema, I, S>;
};
/**
 * With the sidemenu plugin we can position a menu next to a hovered block.
 */
export declare class SideMenuView<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema> implements PluginView {
    private readonly editor;
    private readonly sideMenuDetection;
    private readonly pmView;
    state?: SideMenuState<BSchema, I, S>;
    readonly emitUpdate: (state: SideMenuState<BSchema, I, S>) => void;
    private mousePos;
    private hoveredBlock;
    menuFrozen: boolean;
    isDragOrigin: boolean;
    constructor(editor: BlockNoteEditor<BSchema, I, S>, sideMenuDetection: "viewport" | "editor", pmView: EditorView, emitUpdate: (state: SideMenuState<BSchema, I, S>) => void);
    updateState: (state: SideMenuState<BSchema, I, S>) => void;
    updateStateFromMousePos: () => void;
    /**
     * If the event is outside the editor contents,
     * we dispatch a fake event, so that we can still drop the content
     * when dragging / dropping to the side of the editor
     */
    onDrop: (event: DragEvent) => void;
    /**
     * If a block is being dragged, ProseMirror usually gets the context of what's
     * being dragged from `view.dragging`, which is automatically set when a
     * `dragstart` event fires in the editor. However, if the user tries to drag
     * and drop blocks between multiple editors, only the one in which the drag
     * began has that context, so we need to set it on the others manually. This
     * ensures that PM always drops the blocks in between other blocks, and not
     * inside them.
     *
     * After the `dragstart` event fires on the drag handle, it sets
     * `blocknote/html` data on the clipboard. This handler fires right after,
     * parsing the `blocknote/html` data into nodes and setting them on
     * `view.dragging`.
     *
     * Note: Setting `view.dragging` on `dragover` would be better as the user
     * could then drag between editors in different windows, but you can only
     * access `dataTransfer` contents on `dragstart` and `drop` events.
     */
    onDragStart: (event: DragEvent) => void;
    /**
     * If the event is outside the editor contents,
     * we dispatch a fake event, so that we can still drop the content
     * when dragging / dropping to the side of the editor
     */
    onDragOver: (event: DragEvent) => void;
    onKeyDown: (_event: KeyboardEvent) => void;
    onMouseMove: (event: MouseEvent) => void;
    private createSyntheticEvent;
    update(_view: EditorView, prevState: EditorState): void;
    destroy(): void;
}
export declare const sideMenuPluginKey: PluginKey<any>;
export declare class SideMenuProsemirrorPlugin<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema> extends EventEmitter<any> {
    private readonly editor;
    view: SideMenuView<BSchema, I, S> | undefined;
    readonly plugin: Plugin;
    constructor(editor: BlockNoteEditor<BSchema, I, S>, sideMenuDetection: "viewport" | "editor");
    onUpdate(callback: (state: SideMenuState<BSchema, I, S>) => void): () => void;
    /**
     * Handles drag & drop events for blocks.
     */
    blockDragStart: (event: {
        dataTransfer: DataTransfer | null;
        clientY: number;
    }, block: Block<BSchema, I, S>) => void;
    /**
     * Handles drag & drop events for blocks.
     */
    blockDragEnd: () => void;
    /**
     * Freezes the side menu. When frozen, the side menu will stay
     * attached to the same block regardless of which block is hovered by the
     * mouse cursor.
     */
    freezeMenu: () => void;
    /**
     * Unfreezes the side menu. When frozen, the side menu will stay
     * attached to the same block regardless of which block is hovered by the
     * mouse cursor.
     */
    unfreezeMenu: () => void;
}
