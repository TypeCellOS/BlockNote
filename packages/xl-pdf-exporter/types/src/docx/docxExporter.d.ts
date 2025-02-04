import { Block, BlockNoteSchema, BlockSchema, InlineContentSchema, StyleSchema, StyledText } from "@blocknote/core";
import { Document, IRunPropertiesOptions, Paragraph, ParagraphChild, Table, TextRun } from "docx";
import { Exporter, ExporterOptions } from "@blocknote/core";
export declare class DOCXExporter<B extends BlockSchema, S extends StyleSchema, I extends InlineContentSchema> extends Exporter<B, I, S, Promise<Paragraph[] | Paragraph | Table> | Paragraph[] | Paragraph | Table, ParagraphChild, IRunPropertiesOptions, TextRun> {
    readonly schema: BlockNoteSchema<B, I, S>;
    readonly mappings: Exporter<NoInfer<B>, NoInfer<I>, NoInfer<S>, Promise<Paragraph[] | Paragraph | Table> | Paragraph[] | Paragraph | Table, ParagraphChild, IRunPropertiesOptions, TextRun>["mappings"];
    constructor(schema: BlockNoteSchema<B, I, S>, mappings: Exporter<NoInfer<B>, NoInfer<I>, NoInfer<S>, Promise<Paragraph[] | Paragraph | Table> | Paragraph[] | Paragraph | Table, ParagraphChild, IRunPropertiesOptions, TextRun>["mappings"], options?: Partial<ExporterOptions>);
    transformStyledText(styledText: StyledText<S>, hyperlink?: boolean): TextRun;
    transformBlocks(blocks: Block<B, I, S>[], nestingLevel?: number): Promise<Array<Paragraph | Table>>;
    getFonts(): Promise<ConstructorParameters<typeof Document>[0]["fonts"]>;
    createDocumentProperties(): Promise<Partial<ConstructorParameters<typeof Document>[0]>>;
    toBlob(blocks: Block<B, I, S>[]): Promise<Blob>;
    toDocxJsDocument(blocks: Block<B, I, S>[]): Promise<Document>;
}
