import { BlockFromConfig, BlockNoteEditor, BlockSchemaWithBlock, CustomBlockConfig, InlineContentSchema, PartialBlockFromConfig, Props, PropSchema, StyleSchema } from "@blocknote/core";
import { FC, ReactNode } from "react";
export type ReactCustomBlockRenderProps<T extends CustomBlockConfig, I extends InlineContentSchema, S extends StyleSchema> = {
    block: BlockFromConfig<T, I, S>;
    editor: BlockNoteEditor<BlockSchemaWithBlock<T["type"], T>, I, S>;
    contentRef: (node: HTMLElement | null) => void;
};
export type ReactCustomBlockImplementation<T extends CustomBlockConfig, I extends InlineContentSchema, S extends StyleSchema> = {
    render: FC<ReactCustomBlockRenderProps<T, I, S>>;
    toExternalHTML?: FC<ReactCustomBlockRenderProps<T, I, S>>;
    parse?: (el: HTMLElement) => PartialBlockFromConfig<T, I, S>["props"] | undefined;
};
export declare function BlockContentWrapper<BType extends string, PSchema extends PropSchema>(props: {
    blockType: BType;
    blockProps: Props<PSchema>;
    propSchema: PSchema;
    isFileBlock?: boolean;
    domAttributes?: Record<string, string>;
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function createReactBlockSpec<const T extends CustomBlockConfig, const I extends InlineContentSchema, const S extends StyleSchema>(blockConfig: T, blockImplementation: ReactCustomBlockImplementation<T, I, S>): {
    config: T;
    implementation: import("@blocknote/core").TiptapBlockImplementation<T, any, InlineContentSchema, StyleSchema>;
};
