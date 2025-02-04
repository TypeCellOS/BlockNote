/// <reference types="react" />
import { Block, BlockNoteSchema, BlockSchema, DefaultProps, Exporter, ExporterOptions, InlineContentSchema, StyleSchema, StyledText } from "@blocknote/core";
import { Font, Link, Text, TextProps } from "@react-pdf/renderer";
import { Style } from "./types.js";
type Options = ExporterOptions & {
    /**
     *
     * @default uses the remote emoji source hosted on cloudflare (https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/)
     */
    emojiSource: false | ReturnType<typeof Font.getEmojiSource>;
};
/**
 * Exports a BlockNote document to a .pdf file using the react-pdf library.
 */
export declare class PDFExporter<B extends BlockSchema, S extends StyleSchema, I extends InlineContentSchema> extends Exporter<B, I, S, React.ReactElement<Text>, React.ReactElement<Link> | React.ReactElement<Text>, TextProps["style"], React.ReactElement<Text>> {
    /**
     * The schema of your editor. The mappings are automatically typed checked against this schema.
     */
    protected readonly schema: BlockNoteSchema<B, I, S>;
    private fontsRegistered;
    styles: {
        page: {
            paddingTop: number;
            paddingBottom: number;
            paddingHorizontal: number;
            fontFamily: string;
            fontSize: number;
            lineHeight: number;
        };
        block: {};
        blockChildren: {};
        header: {};
        footer: {
            position: "absolute";
        };
    };
    readonly options: Options;
    constructor(
    /**
     * The schema of your editor. The mappings are automatically typed checked against this schema.
     */
    schema: BlockNoteSchema<B, I, S>, 
    /**
     * The mappings that map the BlockNote schema to the react-pdf content.
     *
     * Pass {@link pdfDefaultSchemaMappings} for the default schema.
     */
    mappings: Exporter<NoInfer<B>, NoInfer<I>, NoInfer<S>, React.ReactElement<Text>, // RB
    // RB
    React.ReactElement<Link> | React.ReactElement<Text>, // RI
    TextProps["style"], // RS
    React.ReactElement<Text>>["mappings"], options?: Partial<Options>);
    /**
     * Mostly for internal use, you probably want to use `toBlob` or `toReactPDFDocument` instead.
     */
    transformStyledText(styledText: StyledText<S>): import("react/jsx-runtime").JSX.Element;
    /**
     * Mostly for internal use, you probably want to use `toBlob` or `toReactPDFDocument` instead.
     */
    transformBlocks(blocks: Block<B, I, S>[], // Or BlockFromConfig<B[keyof B], I, S>?
    nestingLevel?: number): Promise<React.ReactElement<Text>[]>;
    protected registerFonts(): Promise<void>;
    /**
     * Convert a document (array of Blocks) to a react-pdf Document.
     */
    toReactPDFDocument(blocks: Block<B, I, S>[], options?: {
        /**
         * Add a header to every page.
         * The React component passed must be a React-PDF component
         */
        header?: React.ReactElement;
        /**
         * Add a footer to every page.
         * The React component passed must be a React-PDF component
         */
        footer?: React.ReactElement;
    }): Promise<import("react/jsx-runtime").JSX.Element>;
    protected blocknoteDefaultPropsToReactPDFStyle(props: Partial<DefaultProps>): Style;
}
export {};
