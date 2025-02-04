/// <reference types="react" />
import { Block, BlockNoteSchema, BlockSchema, DefaultProps, InlineContentSchema, StyleSchema, StyledText } from "@blocknote/core";
import { Exporter, ExporterOptions } from "@blocknote/core";
import { Font, Link, Text, TextProps } from "@react-pdf/renderer";
import { Style } from "./types.js";
type Options = ExporterOptions & {
    emojiSource: false | ReturnType<typeof Font.getEmojiSource>;
};
export declare class PDFExporter<B extends BlockSchema, S extends StyleSchema, I extends InlineContentSchema> extends Exporter<B, I, S, React.ReactElement<Text>, React.ReactElement<Link> | React.ReactElement<Text>, TextProps["style"], React.ReactElement<Text>> {
    readonly schema: BlockNoteSchema<B, I, S>;
    readonly options: Options;
    constructor(schema: BlockNoteSchema<B, I, S>, mappings: Exporter<NoInfer<B>, NoInfer<I>, NoInfer<S>, React.ReactElement<Text>, // RB
    // RB
    React.ReactElement<Link> | React.ReactElement<Text>, // RI
    TextProps["style"], // RS
    React.ReactElement<Text>>["mappings"], options?: Partial<Options>);
    transformStyledText(styledText: StyledText<S>): import("react/jsx-runtime").JSX.Element;
    transformBlocks(blocks: Block<B, I, S>[], // Or BlockFromConfig<B[keyof B], I, S>?
    nestingLevel?: number): Promise<React.ReactElement<Text>[]>;
    createStyles(): {
        page: {
            paddingTop: number;
            paddingBottom: number;
            paddingHorizontal: number;
            fontFamily: string;
            fontSize: number;
            lineHeight: number;
        };
        section: {};
    };
    registerFonts(): Promise<void>;
    toReactPDFDocument(blocks: Block<B, I, S>[]): Promise<import("react/jsx-runtime").JSX.Element>;
    protected blocknoteDefaultPropsToReactPDFStyle(props: Partial<DefaultProps>): Style;
}
export {};
