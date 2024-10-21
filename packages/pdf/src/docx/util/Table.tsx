import {
  InlineContent,
  InlineContentSchema,
  StyleSchema,
  TableContent,
} from "@blocknote/core";
import {
  Table as DocxTable,
  Paragraph,
  ParagraphChild,
  TableCell,
  TableRow,
} from "docx";

export const Table = (
  data: TableContent<InlineContentSchema>["rows"],
  inlineContentTransformer: (
    inlineContent: InlineContent<InlineContentSchema, StyleSchema>[]
  ) => ParagraphChild[]
) => {
  return new DocxTable({
    rows: data.map(
      (row) =>
        new TableRow({
          children: row.cells.map(
            (cell) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: inlineContentTransformer(cell),
                  }),
                ],
              })
          ),
        })
    ),
  });
};
