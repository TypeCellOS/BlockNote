import { Plugin } from "prosemirror-state";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { UiElementPosition } from "../../extensions-shared/UiElementPosition.js";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema/index.js";
import { EventEmitter } from "../../util/EventEmitter.js";
export type SuggestionMenuState = UiElementPosition & {
    query: string;
    ignoreQueryLength?: boolean;
};
/**
 * A ProseMirror plugin for suggestions, designed to make '/'-commands possible as well as mentions.
 *
 * This is basically a simplified version of TipTap's [Suggestions](https://github.com/ueberdosis/tiptap/tree/db92a9b313c5993b723c85cd30256f1d4a0b65e1/packages/suggestion) plugin.
 *
 * This version is adapted from the aforementioned version in the following ways:
 * - This version supports generic items instead of only strings (to allow for more advanced filtering for example)
 * - This version hides some unnecessary complexity from the user of the plugin.
 * - This version handles key events differently
 */
export declare class SuggestionMenuProseMirrorPlugin<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema> extends EventEmitter<any> {
    private view;
    readonly plugin: Plugin;
    private triggerCharacters;
    constructor(editor: BlockNoteEditor<BSchema, I, S>);
    onUpdate(triggerCharacter: string, callback: (state: SuggestionMenuState) => void): () => void;
    addTriggerCharacter: (triggerCharacter: string) => void;
    removeTriggerCharacter: (triggerCharacter: string) => void;
    closeMenu: () => void;
    clearQuery: () => void;
    get shown(): boolean;
}
export declare function createSuggestionMenu<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>, triggerCharacter: string): void;
