import { EventEmitter, UiElementPosition } from "@blocknote/core";
import { Plugin, PluginKey, PluginView } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
export type AIInlineToolbarState = UiElementPosition & {
    prompt: string;
    operation: "replaceSelection" | "insertAfterSelection";
};
export declare class AIInlineToolbarView implements PluginView {
    private readonly pmView;
    state?: AIInlineToolbarState;
    emitUpdate: () => void;
    constructor(pmView: EditorView, emitUpdate: (state: AIInlineToolbarState) => void);
    blurHandler: (event: FocusEvent) => void;
    dragHandler: () => void;
    closeHandler: () => void;
    scrollHandler: () => void;
    update(view: EditorView): void;
    destroy(): void;
    open(prompt: string, operation: "replaceSelection" | "insertAfterSelection"): void;
    close(): void;
    closeMenu: () => void;
    getSelectionBoundingBox(): DOMRect;
}
export declare const aiInlineToolbarPluginKey: PluginKey<any>;
export declare class AIInlineToolbarProsemirrorPlugin extends EventEmitter<any> {
    private view;
    readonly plugin: Plugin;
    constructor();
    open(prompt: string, operation: "replaceSelection" | "insertAfterSelection"): void;
    close(): void;
    get shown(): boolean;
    onUpdate(callback: (state: AIInlineToolbarState) => void): () => void;
    closeMenu: () => void;
}
