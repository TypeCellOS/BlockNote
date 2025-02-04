import { Plugin, PluginKey } from "prosemirror-state";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { UiElementPosition } from "../../extensions-shared/UiElementPosition.js";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema/index.js";
import { EventEmitter } from "../../util/EventEmitter.js";
export type LinkToolbarState = UiElementPosition & {
    url: string;
    text: string;
};
export declare const linkToolbarPluginKey: PluginKey<any>;
export declare class LinkToolbarProsemirrorPlugin<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema> extends EventEmitter<any> {
    private view;
    readonly plugin: Plugin;
    constructor(editor: BlockNoteEditor<BSchema, I, S>);
    onUpdate(callback: (state: LinkToolbarState) => void): () => void;
    /**
     * Edit the currently hovered link.
     */
    editLink: (url: string, text: string) => void;
    /**
     * Delete the currently hovered link.
     */
    deleteLink: () => void;
    /**
     * When hovering on/off links using the mouse cursor, the link toolbar will
     * open & close with a delay.
     *
     * This function starts the delay timer, and should be used for when the mouse
     * cursor enters the link toolbar.
     */
    startHideTimer: () => void;
    /**
     * When hovering on/off links using the mouse cursor, the link toolbar will
     * open & close with a delay.
     *
     * This function stops the delay timer, and should be used for when the mouse
     * cursor exits the link toolbar.
     */
    stopHideTimer: () => void;
    get shown(): boolean;
    closeMenu: () => void;
}
