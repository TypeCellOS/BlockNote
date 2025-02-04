import { BlockMapping, DefaultBlockSchema, pageBreakSchema } from "@blocknote/core";
import { Table as DocxTable, Paragraph, ParagraphChild } from "docx";
export declare const docxBlockMappingForDefaultSchema: BlockMapping<DefaultBlockSchema & typeof pageBreakSchema.blockSchema, any, any, Promise<Paragraph[] | Paragraph | DocxTable> | Paragraph[] | Paragraph | DocxTable, ParagraphChild>;
