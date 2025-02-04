import { EditorOptions } from "@tiptap/core";
import { Editor as TiptapEditor } from "@tiptap/core";
import { EditorState, Transaction } from "@tiptap/pm/state";
import { PartialBlock } from "../blocks/defaultBlocks.js";
import { StyleSchema } from "../schema/index.js";
export type BlockNoteTipTapEditorOptions = Partial<Omit<EditorOptions, "content">> & {
    content: PartialBlock<any, any, any>[];
};
/**
 * Custom Editor class that extends TiptapEditor and separates
 * the creation of the view from the constructor.
 */
export declare class BlockNoteTipTapEditor extends TiptapEditor {
    private _state;
    private _creating;
    static create: (options: BlockNoteTipTapEditorOptions, styleSchema: StyleSchema) => BlockNoteTipTapEditor;
    protected constructor(options: BlockNoteTipTapEditorOptions, styleSchema: StyleSchema);
    get state(): EditorState;
    dispatch(tr: Transaction): void;
    /**
     * Replace the default `createView` method with a custom one - which we call on mount
     */
    private createViewAlternative;
    /**
     * Mounts / unmounts the editor to a dom element
     *
     * @param element DOM element to mount to, ur null / undefined to destroy
     */
    mount: (element?: HTMLElement | null) => void;
}
