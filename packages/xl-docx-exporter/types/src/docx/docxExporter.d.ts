import { Block, BlockNoteSchema, BlockSchema, InlineContentSchema, StyleSchema, StyledText } from "@blocknote/core";
import { Document, IRunPropertiesOptions, ISectionOptions, Paragraph, ParagraphChild, Table, TextRun } from "docx";
import { Exporter, ExporterOptions } from "@blocknote/core";
type DocumentOptions = Partial<ConstructorParameters<typeof Document>[0]>;
/**
 * Exports a BlockNote document to a .docx file using the docxjs library.
 */
export declare class DOCXExporter<B extends BlockSchema, S extends StyleSchema, I extends InlineContentSchema> extends Exporter<B, I, S, Promise<Paragraph[] | Paragraph | Table> | Paragraph[] | Paragraph | Table, ParagraphChild, IRunPropertiesOptions, TextRun> {
    /**
     * The schema of your editor. The mappings are automatically typed checked against this schema.
     */
    protected readonly schema: BlockNoteSchema<B, I, S>;
    /**
     * The mappings that map the BlockNote schema to the docxjs content.
     * Pass {@link docxDefaultSchemaMappings} for the default schema.
     */
    protected readonly mappings: Exporter<NoInfer<B>, NoInfer<I>, NoInfer<S>, Promise<Paragraph[] | Paragraph | Table> | Paragraph[] | Paragraph | Table, ParagraphChild, IRunPropertiesOptions, TextRun>["mappings"];
    constructor(
    /**
     * The schema of your editor. The mappings are automatically typed checked against this schema.
     */
    schema: BlockNoteSchema<B, I, S>, 
    /**
     * The mappings that map the BlockNote schema to the docxjs content.
     * Pass {@link docxDefaultSchemaMappings} for the default schema.
     */
    mappings: Exporter<NoInfer<B>, NoInfer<I>, NoInfer<S>, Promise<Paragraph[] | Paragraph | Table> | Paragraph[] | Paragraph | Table, ParagraphChild, IRunPropertiesOptions, TextRun>["mappings"], options?: Partial<ExporterOptions>);
    /**
     * Mostly for internal use, you probably want to use `toBlob` or `toDocxJsDocument` instead.
     */
    transformStyledText(styledText: StyledText<S>, hyperlink?: boolean): TextRun;
    /**
     * Mostly for internal use, you probably want to use `toBlob` or `toDocxJsDocument` instead.
     */
    transformBlocks(blocks: Block<B, I, S>[], nestingLevel?: number): Promise<Array<Paragraph | Table>>;
    protected getFonts(): Promise<DocumentOptions["fonts"]>;
    protected createDefaultDocumentOptions(): Promise<DocumentOptions>;
    /**
     * Convert a document (array of Blocks to a Blob representing a .docx file)
     */
    toBlob(blocks: Block<B, I, S>[], options?: {
        sectionOptions: Omit<ISectionOptions, "children">;
        documentOptions: DocumentOptions;
    }): Promise<Blob>;
    /**
     * Convert a document (array of Blocks to a docxjs Document)
     */
    toDocxJsDocument(blocks: Block<B, I, S>[], options?: {
        sectionOptions: Omit<ISectionOptions, "children">;
        documentOptions: DocumentOptions;
    }): Promise<Document>;
}
export {};
