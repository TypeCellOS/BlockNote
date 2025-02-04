import { DefaultBlockSchema } from "@blocknote/core";
import { BlockMapping } from "@blocknote/core/src/exporter/mapping.js";
import { Table as DocxTable, Paragraph, ParagraphChild } from "docx";
export declare const docxBlockMappingForDefaultSchema: BlockMapping<DefaultBlockSchema, any, any, Promise<Paragraph[] | Paragraph | DocxTable> | Paragraph[] | Paragraph | DocxTable, ParagraphChild>;
