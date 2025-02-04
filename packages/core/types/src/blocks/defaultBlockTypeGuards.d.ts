import type { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { BlockConfig, BlockFromConfig, BlockSchema, FileBlockConfig, InlineContentSchema, StyleSchema } from "../schema/index.js";
import { Block, DefaultBlockSchema, DefaultInlineContentSchema } from "./defaultBlocks.js";
import { defaultProps } from "./defaultProps.js";
export declare function checkBlockTypeInSchema<Config extends BlockConfig, I extends InlineContentSchema, S extends StyleSchema>(blockConfig: Config, editor: BlockNoteEditor<any, I, S>): editor is BlockNoteEditor<{
    Type: Config;
}, I, S>;
export declare function checkDefaultBlockTypeInSchema<BlockType extends keyof DefaultBlockSchema, I extends InlineContentSchema, S extends StyleSchema>(blockType: BlockType, editor: BlockNoteEditor<any, I, S>): editor is BlockNoteEditor<{
    Type: DefaultBlockSchema[BlockType];
}, I, S>;
export declare function checkDefaultInlineContentTypeInSchema<InlineContentType extends keyof DefaultInlineContentSchema, B extends BlockSchema, S extends StyleSchema>(inlineContentType: InlineContentType, editor: BlockNoteEditor<B, any, S>): editor is BlockNoteEditor<B, {
    Type: DefaultInlineContentSchema[InlineContentType];
}, S>;
export declare function checkBlockIsDefaultType<BlockType extends keyof DefaultBlockSchema, I extends InlineContentSchema, S extends StyleSchema>(blockType: BlockType, block: Block<any, I, S>, editor: BlockNoteEditor<any, I, S>): block is BlockFromConfig<DefaultBlockSchema[BlockType], I, S>;
export declare function checkBlockIsFileBlock<B extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(block: Block<any, I, S>, editor: BlockNoteEditor<B, I, S>): block is BlockFromConfig<FileBlockConfig, I, S>;
export declare function checkBlockIsFileBlockWithPreview<B extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(block: Block<any, I, S>, editor: BlockNoteEditor<B, I, S>): block is BlockFromConfig<FileBlockConfig & {
    propSchema: Required<FileBlockConfig["propSchema"]>;
}, I, S>;
export declare function checkBlockIsFileBlockWithPlaceholder<B extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(block: Block<B, I, S>, editor: BlockNoteEditor<B, I, S>): boolean | undefined;
export declare function checkBlockTypeHasDefaultProp<Prop extends keyof typeof defaultProps, I extends InlineContentSchema, S extends StyleSchema>(prop: Prop, blockType: string, editor: BlockNoteEditor<any, I, S>): editor is BlockNoteEditor<{
    [BT in string]: {
        type: BT;
        propSchema: {
            [P in Prop]: (typeof defaultProps)[P];
        };
        content: "table" | "inline" | "none";
    };
}, I, S>;
export declare function checkBlockHasDefaultProp<Prop extends keyof typeof defaultProps, I extends InlineContentSchema, S extends StyleSchema>(prop: Prop, block: Block<any, I, S>, editor: BlockNoteEditor<any, I, S>): block is BlockFromConfig<{
    type: string;
    propSchema: {
        [P in Prop]: (typeof defaultProps)[P];
    };
    content: "table" | "inline" | "none";
}, I, S>;
