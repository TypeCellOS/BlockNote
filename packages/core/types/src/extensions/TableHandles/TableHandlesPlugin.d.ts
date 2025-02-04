import { Plugin, PluginKey, PluginView } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { DefaultBlockSchema } from "../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { BlockFromConfigNoChildren, BlockSchemaWithBlock, InlineContentSchema, StyleSchema } from "../../schema/index.js";
import { EventEmitter } from "../../util/EventEmitter.js";
export type TableHandlesState<I extends InlineContentSchema, S extends StyleSchema> = {
    show: boolean;
    showAddOrRemoveRowsButton: boolean;
    showAddOrRemoveColumnsButton: boolean;
    referencePosCell: DOMRect | undefined;
    referencePosTable: DOMRect;
    block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], I, S>;
    colIndex: number | undefined;
    rowIndex: number | undefined;
    draggingState: {
        draggedCellOrientation: "row" | "col";
        originalIndex: number;
        mousePos: number;
    } | undefined;
    widgetContainer: HTMLElement | undefined;
};
export declare class TableHandlesView<I extends InlineContentSchema, S extends StyleSchema> implements PluginView {
    private readonly editor;
    private readonly pmView;
    state?: TableHandlesState<I, S>;
    emitUpdate: () => void;
    tableId: string | undefined;
    tablePos: number | undefined;
    tableElement: HTMLElement | undefined;
    menuFrozen: boolean;
    mouseState: "up" | "down" | "selecting";
    prevWasEditable: boolean | null;
    constructor(editor: BlockNoteEditor<BlockSchemaWithBlock<"table", DefaultBlockSchema["table"]>, I, S>, pmView: EditorView, emitUpdate: (state: TableHandlesState<I, S>) => void);
    viewMousedownHandler: () => void;
    mouseUpHandler: (event: MouseEvent) => void;
    mouseMoveHandler: (event: MouseEvent) => false | undefined;
    dragOverHandler: (event: DragEvent) => void;
    dropHandler: (event: DragEvent) => void;
    update(): void;
    destroy(): void;
}
export declare const tableHandlesPluginKey: PluginKey<any>;
export declare class TableHandlesProsemirrorPlugin<I extends InlineContentSchema, S extends StyleSchema> extends EventEmitter<any> {
    private readonly editor;
    private view;
    readonly plugin: Plugin;
    constructor(editor: BlockNoteEditor<BlockSchemaWithBlock<"table", DefaultBlockSchema["table"]>, I, S>);
    onUpdate(callback: (state: TableHandlesState<I, S>) => void): () => void;
    /**
     * Callback that should be set on the `dragStart` event for whichever element
     * is used as the column drag handle.
     */
    colDragStart: (event: {
        dataTransfer: DataTransfer | null;
        clientX: number;
    }) => void;
    /**
     * Callback that should be set on the `dragStart` event for whichever element
     * is used as the row drag handle.
     */
    rowDragStart: (event: {
        dataTransfer: DataTransfer | null;
        clientY: number;
    }) => void;
    /**
     * Callback that should be set on the `dragEnd` event for both the element
     * used as the row drag handle, and the one used as the column drag handle.
     */
    dragEnd: () => void;
    /**
     * Freezes the drag handles. When frozen, they will stay attached to the same
     * cell regardless of which cell is hovered by the mouse cursor.
     */
    freezeHandles: () => void;
    /**
     * Unfreezes the drag handles. When frozen, they will stay attached to the
     * same cell regardless of which cell is hovered by the mouse cursor.
     */
    unfreezeHandles: () => void;
}
