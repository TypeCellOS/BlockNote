import { Attributes, Editor, Extension, Node, NodeConfig } from "@tiptap/core";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { InlineContentSchema } from "../inlineContent/types.js";
import { PropSchema, Props } from "../propTypes.js";
import { StyleSchema } from "../styles/types.js";
import { BlockConfig, BlockSchemaFromSpecs, BlockSchemaWithBlock, BlockSpecs, SpecificBlock, TiptapBlockImplementation } from "./types.js";
export declare function propsToAttributes(propSchema: PropSchema): Attributes;
export declare function getBlockFromPos<BType extends string, Config extends BlockConfig, BSchema extends BlockSchemaWithBlock<BType, Config>, I extends InlineContentSchema, S extends StyleSchema>(getPos: (() => number) | boolean, editor: BlockNoteEditor<BSchema, I, S>, tipTapEditor: Editor, type: BType): SpecificBlock<BSchema, BType, I, S>;
export declare function wrapInBlockStructure<BType extends string, PSchema extends PropSchema>(element: {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
    destroy?: () => void;
}, blockType: BType, blockProps: Props<PSchema>, propSchema: PSchema, isFileBlock?: boolean, domAttributes?: Record<string, string>): {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
    destroy?: () => void;
};
type StronglyTypedTipTapNode<Name extends string, Content extends "inline*" | "tableRow+" | "blockContainer+" | "column column+" | ""> = Node & {
    name: Name;
    config: {
        content: Content;
    };
};
export declare function createStronglyTypedTiptapNode<Name extends string, Content extends "inline*" | "tableRow+" | "blockContainer+" | "column column+" | "">(config: NodeConfig & {
    name: Name;
    content: Content;
}): StronglyTypedTipTapNode<Name, Content>;
export declare function createInternalBlockSpec<T extends BlockConfig>(config: T, implementation: TiptapBlockImplementation<T, any, InlineContentSchema, StyleSchema>): {
    config: T;
    implementation: TiptapBlockImplementation<T, any, InlineContentSchema, StyleSchema>;
};
export declare function createBlockSpecFromStronglyTypedTiptapNode<T extends Node, P extends PropSchema>(node: T, propSchema: P, requiredExtensions?: Array<Extension | Node>): {
    config: {
        type: T["name"];
        content: T["config"]["content"] extends "inline*" ? "inline" : T["config"]["content"] extends "tableRow+" ? "table" : "none";
        propSchema: P;
    };
    implementation: TiptapBlockImplementation<{
        type: T["name"];
        content: T["config"]["content"] extends "inline*" ? "inline" : T["config"]["content"] extends "tableRow+" ? "table" : "none";
        propSchema: P;
    }, any, InlineContentSchema, StyleSchema>;
};
export declare function getBlockSchemaFromSpecs<T extends BlockSpecs>(specs: T): BlockSchemaFromSpecs<T>;
export {};
