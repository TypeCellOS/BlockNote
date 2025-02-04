import { Editor } from "@tiptap/core";
import { TagParseRule } from "@tiptap/pm/model";
import { NodeView } from "@tiptap/pm/view";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { InlineContentSchema } from "../inlineContent/types.js";
import { StyleSchema } from "../styles/types.js";
import { BlockConfig, BlockFromConfig, BlockSchemaWithBlock, PartialBlockFromConfig } from "./types.js";
export type CustomBlockConfig = BlockConfig & {
    content: "inline" | "none";
};
export type CustomBlockImplementation<T extends CustomBlockConfig, I extends InlineContentSchema, S extends StyleSchema> = {
    render: (
    /**
     * The custom block to render
     */
    block: BlockFromConfig<T, I, S>, 
    /**
     * The BlockNote editor instance
     * This is typed generically. If you want an editor with your custom schema, you need to
     * cast it manually, e.g.: `const e = editor as BlockNoteEditor<typeof mySchema>;`
     */
    editor: BlockNoteEditor<BlockSchemaWithBlock<T["type"], T>, I, S>) => {
        dom: HTMLElement;
        contentDOM?: HTMLElement;
        destroy?: () => void;
    };
    toExternalHTML?: (block: BlockFromConfig<T, I, S>, editor: BlockNoteEditor<BlockSchemaWithBlock<T["type"], T>, I, S>) => {
        dom: HTMLElement;
        contentDOM?: HTMLElement;
    };
    parse?: (el: HTMLElement) => PartialBlockFromConfig<T, I, S>["props"] | undefined;
};
export declare function applyNonSelectableBlockFix(nodeView: NodeView, editor: Editor): void;
export declare function getParseRules(config: BlockConfig, customParseFunction: CustomBlockImplementation<any, any, any>["parse"]): TagParseRule[];
export declare function createBlockSpec<T extends CustomBlockConfig, I extends InlineContentSchema, S extends StyleSchema>(blockConfig: T, blockImplementation: CustomBlockImplementation<NoInfer<T>, I, S>): {
    config: T;
    implementation: import("./types.js").TiptapBlockImplementation<T, any, InlineContentSchema, StyleSchema>;
};
