import { EditorState, Plugin, PluginKey, PluginView } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { UiElementPosition } from "../../extensions-shared/UiElementPosition.js";
import type { BlockFromConfig, FileBlockConfig, InlineContentSchema, StyleSchema } from "../../schema/index.js";
import { EventEmitter } from "../../util/EventEmitter.js";
export type FilePanelState<I extends InlineContentSchema, S extends StyleSchema> = UiElementPosition & {
    block: BlockFromConfig<FileBlockConfig, I, S>;
};
export declare class FilePanelView<I extends InlineContentSchema, S extends StyleSchema> implements PluginView {
    private readonly editor;
    private readonly pluginKey;
    private readonly pmView;
    state?: FilePanelState<I, S>;
    emitUpdate: () => void;
    constructor(editor: BlockNoteEditor<Record<string, FileBlockConfig>, I, S>, pluginKey: PluginKey, pmView: EditorView, emitUpdate: (state: FilePanelState<I, S>) => void);
    mouseDownHandler: () => void;
    dragstartHandler: () => void;
    scrollHandler: () => void;
    update(view: EditorView, prevState: EditorState): void;
    closeMenu: () => void;
    destroy(): void;
}
export declare class FilePanelProsemirrorPlugin<I extends InlineContentSchema, S extends StyleSchema> extends EventEmitter<any> {
    private view;
    readonly plugin: Plugin;
    constructor(editor: BlockNoteEditor<Record<string, FileBlockConfig>, I, S>);
    get shown(): boolean;
    onUpdate(callback: (state: FilePanelState<I, S>) => void): () => void;
    closeMenu: () => void | undefined;
}
