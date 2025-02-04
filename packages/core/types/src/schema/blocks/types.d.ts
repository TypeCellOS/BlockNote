/** Define the main block types **/
import type { Extension, Node } from "@tiptap/core";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { InlineContent, InlineContentSchema, PartialInlineContent } from "../inlineContent/types.js";
import type { PropSchema, Props } from "../propTypes.js";
import type { StyleSchema } from "../styles/types.js";
export type BlockNoteDOMElement = "editor" | "block" | "blockGroup" | "blockContent" | "inlineContent";
export type BlockNoteDOMAttributes = Partial<{
    [DOMElement in BlockNoteDOMElement]: Record<string, string>;
}>;
export type FileBlockConfig = {
    type: string;
    readonly propSchema: PropSchema & {
        caption: {
            default: "";
        };
        name: {
            default: "";
        };
        url?: {
            default: "";
        };
        showPreview?: {
            default: boolean;
        };
        previewWidth?: {
            default: number;
        };
    };
    content: "none";
    isSelectable?: boolean;
    isFileBlock: true;
    fileBlockAccept?: string[];
};
export type BlockConfig = {
    type: string;
    readonly propSchema: PropSchema;
    content: "inline" | "none" | "table";
    isSelectable?: boolean;
    isFileBlock?: false;
} | FileBlockConfig;
export type TiptapBlockImplementation<T extends BlockConfig, B extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema> = {
    requiredExtensions?: Array<Extension | Node>;
    node: Node;
    toInternalHTML: (block: BlockFromConfigNoChildren<T, I, S> & {
        children: BlockNoDefaults<B, I, S>[];
    }, editor: BlockNoteEditor<B, I, S>) => {
        dom: HTMLElement;
        contentDOM?: HTMLElement;
    };
    toExternalHTML: (block: BlockFromConfigNoChildren<T, I, S> & {
        children: BlockNoDefaults<B, I, S>[];
    }, editor: BlockNoteEditor<B, I, S>) => {
        dom: HTMLElement;
        contentDOM?: HTMLElement;
    };
};
export type BlockSpec<T extends BlockConfig, B extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema> = {
    config: T;
    implementation: TiptapBlockImplementation<NoInfer<T>, B, I, S>;
};
type NamesMatch<Blocks extends Record<string, BlockConfig>> = Blocks extends {
    [Type in keyof Blocks]: Type extends string ? Blocks[Type] extends {
        type: Type;
    } ? Blocks[Type] : never : never;
} ? Blocks : never;
export type BlockSchema = NamesMatch<Record<string, BlockConfig>>;
export type BlockSpecs = Record<string, BlockSpec<any, any, InlineContentSchema, StyleSchema>>;
export type BlockImplementations = Record<string, TiptapBlockImplementation<any, any, any, any>>;
export type BlockSchemaFromSpecs<T extends BlockSpecs> = {
    [K in keyof T]: T[K]["config"];
};
export type BlockSchemaWithBlock<BType extends string, C extends BlockConfig> = {
    [k in BType]: C;
};
export type TableContent<I extends InlineContentSchema, S extends StyleSchema = StyleSchema> = {
    type: "tableContent";
    columnWidths: (number | undefined)[];
    rows: {
        cells: InlineContent<I, S>[][];
    }[];
};
export type BlockFromConfigNoChildren<B extends BlockConfig, I extends InlineContentSchema, S extends StyleSchema> = {
    id: string;
    type: B["type"];
    props: Props<B["propSchema"]>;
    content: B["content"] extends "inline" ? InlineContent<I, S>[] : B["content"] extends "table" ? TableContent<I, S> : B["content"] extends "none" ? undefined : never;
};
export type BlockFromConfig<B extends BlockConfig, I extends InlineContentSchema, S extends StyleSchema> = BlockFromConfigNoChildren<B, I, S> & {
    children: BlockNoDefaults<BlockSchema, I, S>[];
};
type BlocksWithoutChildren<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema> = {
    [BType in keyof BSchema]: BlockFromConfigNoChildren<BSchema[BType], I, S>;
};
export type BlockNoDefaults<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema> = BlocksWithoutChildren<BSchema, I, S>[keyof BSchema] & {
    children: BlockNoDefaults<BSchema, I, S>[];
};
export type SpecificBlock<BSchema extends BlockSchema, BType extends keyof BSchema, I extends InlineContentSchema, S extends StyleSchema> = BlocksWithoutChildren<BSchema, I, S>[BType] & {
    children: BlockNoDefaults<BSchema, I, S>[];
};
/** CODE FOR PARTIAL BLOCKS, analogous to above
 *
 * Partial blocks are convenience-wrappers to make it easier to
 *create/update blocks in the editor.
 *
 */
export type PartialTableContent<I extends InlineContentSchema, S extends StyleSchema = StyleSchema> = {
    type: "tableContent";
    columnWidths?: (number | undefined)[];
    rows: {
        cells: PartialInlineContent<I, S>[];
    }[];
};
type PartialBlockFromConfigNoChildren<B extends BlockConfig, I extends InlineContentSchema, S extends StyleSchema> = {
    id?: string;
    type?: B["type"];
    props?: Partial<Props<B["propSchema"]>>;
    content?: B["content"] extends "inline" ? PartialInlineContent<I, S> : B["content"] extends "table" ? PartialTableContent<I, S> : undefined;
};
type PartialBlocksWithoutChildren<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema> = {
    [BType in keyof BSchema]: PartialBlockFromConfigNoChildren<BSchema[BType], I, S>;
};
export type PartialBlockNoDefaults<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema> = PartialBlocksWithoutChildren<BSchema, I, S>[keyof PartialBlocksWithoutChildren<BSchema, I, S>] & Partial<{
    children: PartialBlockNoDefaults<BSchema, I, S>[];
}>;
export type SpecificPartialBlock<BSchema extends BlockSchema, I extends InlineContentSchema, BType extends keyof BSchema, S extends StyleSchema> = PartialBlocksWithoutChildren<BSchema, I, S>[BType] & {
    children?: BlockNoDefaults<BSchema, I, S>[];
};
export type PartialBlockFromConfig<B extends BlockConfig, I extends InlineContentSchema, S extends StyleSchema> = PartialBlockFromConfigNoChildren<B, I, S> & {
    children?: BlockNoDefaults<BlockSchema, I, S>[];
};
export type BlockIdentifier = {
    id: string;
} | string;
export {};
