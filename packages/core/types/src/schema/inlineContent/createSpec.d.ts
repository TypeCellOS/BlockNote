import { TagParseRule } from "@tiptap/pm/model";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { StyleSchema } from "../styles/types.js";
import { CustomInlineContentConfig, InlineContentFromConfig, InlineContentSpec, PartialCustomInlineContentFromConfig } from "./types.js";
export type CustomInlineContentImplementation<T extends CustomInlineContentConfig, S extends StyleSchema> = {
    render: (
    /**
     * The custom inline content to render
     */
    inlineContent: InlineContentFromConfig<T, S>, updateInlineContent: (update: PartialCustomInlineContentFromConfig<T, S>) => void, 
    /**
     * The BlockNote editor instance
     * This is typed generically. If you want an editor with your custom schema, you need to
     * cast it manually, e.g.: `const e = editor as BlockNoteEditor<typeof mySchema>;`
     */
    editor: BlockNoteEditor<any, any, S>) => {
        dom: HTMLElement;
        contentDOM?: HTMLElement;
    };
};
export declare function getInlineContentParseRules(config: CustomInlineContentConfig): TagParseRule[];
export declare function createInlineContentSpec<T extends CustomInlineContentConfig, S extends StyleSchema>(inlineContentConfig: T, inlineContentImplementation: CustomInlineContentImplementation<T, S>): InlineContentSpec<T>;
