import { Exporter, InlineContentSchema, TableContent } from "@blocknote/core";
import { Table as DocxTable, ParagraphChild } from "docx";
export declare const Table: (data: TableContent<InlineContentSchema>, t: Exporter<any, any, any, any, ParagraphChild, any, any>) => DocxTable;
