import { Exporter, InlineContentSchema, TableContent } from "@blocknote/core";
import {
  Table as DocxTable,
  Paragraph,
  ParagraphChild,
  TableCell,
  TableRow,
} from "docx";

export const Table = (
  data: TableContent<InlineContentSchema>,
  t: Exporter<any, any, any, any, ParagraphChild, any, any>
) => {
  const DEFAULT_COLUMN_WIDTH = 120;
  return new DocxTable({
    layout: "autofit",
    columnWidths: data.columnWidths.map(
      (w) =>
        (w ?? DEFAULT_COLUMN_WIDTH) * /* to points */ 0.75 * /* to twips */ 20
    ),
    rows: data.rows.map(
      (row) =>
        new TableRow({
          children: row.cells.map((cell, i) => {
            const width = data.columnWidths?.[i];
            return new TableCell({
              width: width
                ? {
                    size: `${width * 0.75}pt`,
                    type: "dxa",
                  }
                : undefined,
              children: [
                new Paragraph({
                  children: t.transformInlineContent(cell),
                }),
              ],
            });
          }),
        })
    ),
  });
};
