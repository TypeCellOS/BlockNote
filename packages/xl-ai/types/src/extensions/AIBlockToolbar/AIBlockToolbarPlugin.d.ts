import { BlockInfo, EventEmitter, UiElementPosition } from "@blocknote/core";
import { Plugin, PluginKey, PluginView } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
export type AIBlockToolbarState = UiElementPosition & {
    prompt?: string;
};
export declare class AIBlockToolbarView implements PluginView {
    private readonly pmView;
    state?: AIBlockToolbarState;
    emitUpdate: () => void;
    oldBlockInfo: BlockInfo | undefined;
    domElement: HTMLElement | undefined;
    constructor(pmView: EditorView, emitUpdate: (state: AIBlockToolbarState) => void);
    blurHandler: (event: FocusEvent) => void;
    dragHandler: () => void;
    scrollHandler: () => void;
    update(view: EditorView): void;
    destroy(): void;
    closeMenu: () => void;
}
export declare const aiBlockToolbarPluginKey: PluginKey<any>;
export declare class AIBlockToolbarProsemirrorPlugin extends EventEmitter<any> {
    private view;
    readonly plugin: Plugin;
    constructor();
    get shown(): boolean;
    onUpdate(callback: (state: AIBlockToolbarState) => void): () => void;
    closeMenu: () => void;
}
